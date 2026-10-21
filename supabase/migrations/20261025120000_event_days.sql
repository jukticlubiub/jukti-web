-- Multi-day check-in. An event runs for 1–14 check-in days (Admin > Events > Check-in). Each day
-- has its own entry check-in, and each station (Lunch, T-shirt…) belongs to one day, so a 2-day
-- workshop can have Day 1: Check-in + Lunch and Day 2: Check-in + Lunch.
--
-- event_registrations.checked_in_at keeps its meaning: when they first checked in on any day
-- ("attended", used by member activity and certificates). The per-day entries are in
-- event_day_checkins; existing check-ins become Day 1.
-- Needs 20261010120000_event_tickets.sql.

alter table public.events
  add column if not exists check_in_days smallint not null default 1 check (check_in_days between 1 and 14);

alter table public.event_stations
  add column if not exists day smallint not null default 1 check (day between 1 and 14);

drop index if exists public.event_stations_event_idx;
create index event_stations_event_idx on public.event_stations (event_id, day, position);

-- One row per person per day: the primary key is what makes a second entry scan "already in".
create table public.event_day_checkins (
  registration_id uuid not null references public.event_registrations (id) on delete cascade,
  day smallint not null check (day between 1 and 14),
  checked_in_at timestamptz not null default now(),
  checked_in_by text,
  primary key (registration_id, day)
);

alter table public.event_day_checkins enable row level security;
create policy "Event managers read day check-ins" on public.event_day_checkins for select to authenticated
  using ((select public.has_role('event_manager')));
revoke all on public.event_day_checkins from anon;
grant select on public.event_day_checkins to authenticated;

insert into public.event_day_checkins (registration_id, day, checked_in_at)
select r.id, 1, r.checked_in_at from public.event_registrations r where r.checked_in_at is not null
on conflict do nothing;

-- Keeps the days in step when checked_in_at is written directly: re-registering after a cancel
-- clears it (register_for_event), so the days go too; and a check-in written without a day
-- (older code) counts as Day 1. The functions below write the day first, so this skips them.
create function public.sync_day_checkins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.checked_in_at is null then
    delete from public.event_day_checkins where registration_id = new.id;
  elsif not exists (select 1 from public.event_day_checkins c where c.registration_id = new.id) then
    insert into public.event_day_checkins (registration_id, day, checked_in_at) values (new.id, 1, new.checked_in_at);
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_day_checkins() from public, anon, authenticated;

create trigger event_registrations_sync_days
  after update of checked_in_at on public.event_registrations
  for each row when (old.checked_in_at is distinct from new.checked_in_at)
  execute function public.sync_day_checkins();

-- ---------------------------------------------------------------------------
-- How many days. Fewer days can't drop a day that has stations or check-ins.
-- Errors: not_allowed, invalid_days, event_not_found, days_in_use.
-- ---------------------------------------------------------------------------

create function public.set_event_check_in_days(p_event_id uuid, p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_days is null or p_days not between 1 and 14 then raise exception 'invalid_days' using errcode = '22023'; end if;
  perform 1 from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.event_stations s where s.event_id = p_event_id and s.day > p_days)
     or exists (
       select 1 from public.event_day_checkins c
       join public.event_registrations r on r.id = c.registration_id
       where r.event_id = p_event_id and c.day > p_days
     ) then
    raise exception 'days_in_use' using errcode = '22023';
  end if;
  update public.events set check_in_days = p_days where id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Checking someone in (or undoing it) by hand for one day.
-- Errors: not_allowed, registration_not_found, invalid_days.
-- ---------------------------------------------------------------------------

create function public.admin_set_day_checkin(p_registration_id uuid, p_day integer, p_checked_in boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
  v_days smallint;
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into v_reg from public.event_registrations where id = p_registration_id for update;
  if not found then raise exception 'registration_not_found' using errcode = 'P0002'; end if;
  select e.check_in_days into v_days from public.events e where e.id = v_reg.event_id;
  if p_day is null or p_day not between 1 and v_days then raise exception 'invalid_days' using errcode = '22023'; end if;

  if p_checked_in then
    insert into public.event_day_checkins (registration_id, day, checked_in_by)
    values (v_reg.id, p_day, public.current_email())
    on conflict do nothing;
    update public.event_registrations set checked_in_at = coalesce(checked_in_at, now()) where id = v_reg.id;
  else
    delete from public.event_day_checkins where registration_id = v_reg.id and day = p_day;
    update public.event_registrations
    set checked_in_at = (select min(c.checked_in_at) from public.event_day_checkins c where c.registration_id = v_reg.id)
    where id = v_reg.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scanning, now per day. A station's day is its own; the entry takes p_day. Outcomes as before:
-- checked_in / already_checked_in (that day's entry), served / already_served (a station;
-- also_checked_in when the scan also checked them in for that day), unpaid, no_rsvp,
-- waitlisted, cancelled, wrong_station (not this event's station, or a day it doesn't run).
-- ---------------------------------------------------------------------------

drop function public.scan_at_event(uuid, uuid, uuid);
drop function public.scan_ticket(text, uuid, uuid);
drop function public.scan_registration(uuid, uuid, uuid);

create function public.scan_registration(p_reg_id uuid, p_event_id uuid, p_station_id uuid, p_day integer)
returns table (outcome text, at timestamptz, also_checked_in boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
  v_days smallint;
  v_day integer;
  v_at timestamptz;
  v_entered timestamptz;
begin
  select e.check_in_days into v_days from public.events e where e.id = p_event_id;
  if p_station_id is not null then
    select s.day into v_day from public.event_stations s where s.id = p_station_id and s.event_id = p_event_id;
    if not found then
      return query select 'wrong_station', null::timestamptz, false;
      return;
    end if;
  else
    v_day := coalesce(p_day, 1);
  end if;
  if v_days is null or v_day not between 1 and v_days then
    return query select 'wrong_station', null::timestamptz, false;
    return;
  end if;

  select * into v_reg from public.event_registrations r where r.id = p_reg_id and r.event_id = p_event_id for update;
  if not found then
    return query select 'no_rsvp', null::timestamptz, false;
    return;
  end if;
  if v_reg.status <> 'registered' then
    return query select v_reg.status, null::timestamptz, false;
    return;
  end if;
  if v_reg.payment_status in ('unpaid', 'submitted') then
    return query select 'unpaid', null::timestamptz, false;
    return;
  end if;

  -- That day's entry (also when a station is reached without passing the gate scanner).
  insert into public.event_day_checkins (registration_id, day, checked_in_by)
  values (v_reg.id, v_day, public.current_email())
  on conflict do nothing
  returning checked_in_at into v_entered;
  if v_reg.checked_in_at is null then
    update public.event_registrations set checked_in_at = now() where id = v_reg.id;
  end if;

  if p_station_id is null then
    if v_entered is not null then
      return query select 'checked_in', v_entered, false;
    else
      select c.checked_in_at into v_at from public.event_day_checkins c where c.registration_id = v_reg.id and c.day = v_day;
      return query select 'already_checked_in', v_at, false;
    end if;
    return;
  end if;

  insert into public.station_scans (station_id, registration_id, scanned_by)
  values (p_station_id, v_reg.id, public.current_email())
  on conflict do nothing
  returning scanned_at into v_at;

  if v_at is not null then
    return query select 'served', v_at, v_entered is not null;
  else
    select s.scanned_at into v_at from public.station_scans s where s.station_id = p_station_id and s.registration_id = v_reg.id;
    return query select 'already_served', v_at, false;
  end if;
end;
$$;

create function public.scan_at_event(p_member_id uuid, p_event_id uuid, p_station_id uuid default null, p_day integer default 1)
returns table (
  outcome text, name text, member_no text, photo_url text, member_status text,
  at timestamptz, also_checked_in boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members;
  v_reg_id uuid;
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed'; end if;
  select * into v_member from public.members m where m.id = p_member_id;
  if not found then
    return query select 'unknown_member', null::text, null::text, null::text, null::text, null::timestamptz, false;
    return;
  end if;
  select r.id into v_reg_id from public.event_registrations r where r.event_id = p_event_id and r.user_id = p_member_id;
  return query
    select s.outcome, v_member.name, v_member.member_no, v_member.photo_url, v_member.status, s.at, s.also_checked_in
    from public.scan_registration(v_reg_id, p_event_id, p_station_id, p_day) s;
end;
$$;

create function public.scan_ticket(p_ticket_code text, p_event_id uuid, p_station_id uuid default null, p_day integer default 1)
returns table (
  outcome text, name text, member_no text, photo_url text, member_status text,
  at timestamptz, also_checked_in boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
  v_member public.members;
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed'; end if;
  select * into v_reg from public.event_registrations r where r.ticket_code = upper(btrim(p_ticket_code));
  if not found then
    return query select 'unknown_ticket', null::text, null::text, null::text, null::text, null::timestamptz, false;
    return;
  end if;
  select * into v_member from public.members m where m.id = v_reg.user_id;
  if v_reg.event_id <> p_event_id then
    return query select 'wrong_event', v_reg.full_name, v_member.member_no, v_member.photo_url, v_member.status, null::timestamptz, false;
    return;
  end if;
  return query
    select s.outcome, v_reg.full_name, v_member.member_no, v_member.photo_url, v_member.status, s.at, s.also_checked_in
    from public.scan_registration(v_reg.id, p_event_id, p_station_id, p_day) s;
end;
$$;

revoke execute on function public.scan_registration(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.scan_at_event(uuid, uuid, uuid, integer) from public, anon;
revoke execute on function public.scan_ticket(text, uuid, uuid, integer) from public, anon;
revoke execute on function public.set_event_check_in_days(uuid, integer) from public, anon;
revoke execute on function public.admin_set_day_checkin(uuid, integer, boolean) from public, anon;
grant execute on function public.scan_at_event(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.scan_ticket(text, uuid, uuid, integer) to authenticated;
grant execute on function public.set_event_check_in_days(uuid, integer) to authenticated;
grant execute on function public.admin_set_day_checkin(uuid, integer, boolean) to authenticated;
