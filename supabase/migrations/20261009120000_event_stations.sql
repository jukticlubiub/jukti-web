-- Scan stations at events: besides the entry check-in, an event can have stations such
-- as "Lunch" or "Snacks". Scanning a member card at a station records it once; scanning
-- again shows when they were already served. Event Managers run it.
-- Needs 20261006120000_members.sql.

create table public.event_stations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_stations_event_idx on public.event_stations (event_id, position);

-- One row per person per station: the primary key is what stops a second serving.
create table public.station_scans (
  station_id uuid not null references public.event_stations (id) on delete cascade,
  registration_id uuid not null references public.event_registrations (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  scanned_by text,
  primary key (station_id, registration_id)
);

create index station_scans_registration_idx on public.station_scans (registration_id);

alter table public.event_stations enable row level security;
alter table public.station_scans enable row level security;

create policy "Event managers manage stations" on public.event_stations for all to authenticated
  using ((select public.has_role('event_manager'))) with check ((select public.has_role('event_manager')));
create policy "Event managers read scans" on public.station_scans for select to authenticated
  using ((select public.has_role('event_manager')));
-- Marking by hand (people without a member card) and undoing a mistake.
create policy "Event managers mark scans" on public.station_scans for insert to authenticated
  with check ((select public.has_role('event_manager')));
create policy "Event managers undo scans" on public.station_scans for delete to authenticated
  using ((select public.has_role('event_manager')));

revoke all on public.event_stations, public.station_scans from anon;
grant select, insert, update, delete on public.event_stations to authenticated;
grant select, insert, delete on public.station_scans to authenticated;

create trigger event_stations_audit after insert or update or delete on public.event_stations
  for each row execute function public.log_admin_change();

-- ---------------------------------------------------------------------------
-- One scan, decided in one step (so two scanners can't both serve the same card).
-- p_station_id null = the entry. Outcomes:
--   checked_in / already_checked_in   (entry)
--   served / already_served            (a station; `also_checked_in` if this scan
--                                       also checked them in, e.g. the gate missed them)
--   no_rsvp / waitlisted / cancelled / unknown_member / wrong_station
-- `at` is when it happened (or first happened, for the "already" outcomes).
-- Error: not_allowed.
-- ---------------------------------------------------------------------------

create function public.scan_at_event(p_member_id uuid, p_event_id uuid, p_station_id uuid default null)
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
  v_reg public.event_registrations;
  v_at timestamptz;
  v_checked boolean := false;
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed'; end if;

  select * into v_member from public.members m where m.id = p_member_id;
  if not found then
    return query select 'unknown_member', null::text, null::text, null::text, null::text, null::timestamptz, false;
    return;
  end if;

  if p_station_id is not null and not exists (select 1 from public.event_stations s where s.id = p_station_id and s.event_id = p_event_id) then
    return query select 'wrong_station', v_member.name, v_member.member_no, v_member.photo_url, v_member.status, null::timestamptz, false;
    return;
  end if;

  select * into v_reg from public.event_registrations r where r.event_id = p_event_id and r.user_id = p_member_id for update;
  if not found or v_reg.status <> 'registered' then
    return query select coalesce(case v_reg.status when 'waitlisted' then 'waitlisted' when 'cancelled' then 'cancelled' end, 'no_rsvp'),
      v_member.name, v_member.member_no, v_member.photo_url, v_member.status, null::timestamptz, false;
    return;
  end if;

  -- Entry, or a station reached without passing the gate scanner: check them in now.
  if v_reg.checked_in_at is null then
    update public.event_registrations set checked_in_at = now() where id = v_reg.id;
    v_checked := true;
  end if;

  if p_station_id is null then
    return query select case when v_checked then 'checked_in' else 'already_checked_in' end,
      v_member.name, v_member.member_no, v_member.photo_url, v_member.status,
      case when v_checked then now() else v_reg.checked_in_at end, false;
    return;
  end if;

  insert into public.station_scans (station_id, registration_id, scanned_by)
  values (p_station_id, v_reg.id, public.current_email())
  on conflict do nothing
  returning scanned_at into v_at;

  if v_at is not null then
    return query select 'served', v_member.name, v_member.member_no, v_member.photo_url, v_member.status, v_at, v_checked;
  else
    select s.scanned_at into v_at from public.station_scans s where s.station_id = p_station_id and s.registration_id = v_reg.id;
    return query select 'already_served', v_member.name, v_member.member_no, v_member.photo_url, v_member.status, v_at, false;
  end if;
end;
$$;

revoke execute on function public.scan_at_event(uuid, uuid, uuid) from public, anon;
grant execute on function public.scan_at_event(uuid, uuid, uuid) to authenticated;
