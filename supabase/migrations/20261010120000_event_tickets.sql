-- Event tickets and paid events.
--
-- Every RSVP gets a ticket code (e.g. JT-7K3M9Q), shown on the event page and emailed
-- as a QR code; Event Managers scan it at the entry and at stations, members and
-- non-members alike. An event can have a fee: the ticket code is the bKash reference, the
-- attendee submits their payment details, an Event Manager verifies them, and an unpaid
-- ticket can't check in or be served. Needs 20261009120000_event_stations.sql.

-- ---------------------------------------------------------------------------
-- Fees on events
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists fee_amount integer check (fee_amount is null or fee_amount between 0 and 100000),
  add column if not exists fee_bkash_number text check (fee_bkash_number is null or fee_bkash_number ~ '^(\+?88)?01[3-9][0-9]{8}$'),
  add column if not exists fee_note text check (fee_note is null or char_length(fee_note) <= 500);

-- ---------------------------------------------------------------------------
-- Tickets and payment on registrations
-- ---------------------------------------------------------------------------

alter table public.event_registrations
  add column if not exists ticket_code text,
  add column if not exists payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'unpaid', 'submitted', 'paid')),
  add column if not exists payment_sender text,
  add column if not exists payment_txn text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by text;

-- "JT-" and 6 characters without look-alikes (no 0/O, 1/I/L): easy to read out and type.
create function public.new_ticket_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
begin
  loop
    v_code := 'JT-';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.event_registrations r where r.ticket_code = v_code);
  end loop;
  return v_code;
end;
$$;

update public.event_registrations set ticket_code = public.new_ticket_code() where ticket_code is null;
alter table public.event_registrations alter column ticket_code set not null;
create unique index if not exists event_registrations_ticket_idx on public.event_registrations (ticket_code);

-- New RSVPs get a ticket, and owe the fee if the event has one. (Signing up again after
-- cancelling keeps the same row, so the same ticket and payment.)
create function public.event_registration_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.ticket_code := coalesce(new.ticket_code, public.new_ticket_code());
  if exists (select 1 from public.events e where e.id = new.event_id and coalesce(e.fee_amount, 0) > 0) then
    new.payment_status := 'unpaid';
  else
    new.payment_status := 'not_required';
  end if;
  return new;
end;
$$;

create trigger event_registrations_defaults before insert on public.event_registrations
  for each row execute function public.event_registration_defaults();

-- The signed-in user's RSVP, now with their ticket and payment state.
create or replace function public.my_event_registration(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', r.status,
    'position', case when r.status = 'waitlisted' then (
      select count(*)::integer
      from public.event_registrations w
      where w.event_id = r.event_id
        and w.status = 'waitlisted'
        and (w.queued_at, w.id) <= (r.queued_at, r.id)
    ) end,
    'ticket_code', r.ticket_code,
    'payment_status', r.payment_status,
    'payment_sender', r.payment_sender,
    'payment_txn', r.payment_txn
  )
  from public.event_registrations r
  where r.event_id = p_event_id
    and r.user_id = (select auth.uid())
    and r.status <> 'cancelled';
$$;

-- An attendee reports their bKash payment (sender number; transaction ID optional).
-- Errors: not_authenticated, not_registered, not_required, already_paid, invalid_payment.
create function public.submit_event_payment(p_event_id uuid, p_sender text, p_txn text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
  v_sender text := regexp_replace(coalesce(p_sender, ''), '[\s-]', '', 'g');
  v_txn text := nullif(upper(btrim(coalesce(p_txn, ''))), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_reg from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = auth.uid() and r.status <> 'cancelled' for update;
  if not found then raise exception 'not_registered'; end if;
  if v_reg.payment_status = 'not_required' then raise exception 'not_required'; end if;
  if v_reg.payment_status = 'paid' then raise exception 'already_paid'; end if;
  if v_sender !~ '^(\+?88)?01[3-9][0-9]{8}$' or (v_txn is not null and v_txn !~ '^[A-Z0-9]{8,12}$') then
    raise exception 'invalid_payment';
  end if;
  update public.event_registrations
  set payment_status = 'submitted', payment_sender = v_sender, payment_txn = v_txn, payment_submitted_at = now()
  where id = v_reg.id;
  return 'submitted';
end;
$$;

revoke execute on function public.submit_event_payment(uuid, text, text) from public, anon;
grant execute on function public.submit_event_payment(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Scanning: one set of rules for member cards and tickets
-- ---------------------------------------------------------------------------

-- The scan itself, for a registration already found. Internal: called by the two below.
create function public.scan_registration(p_reg_id uuid, p_event_id uuid, p_station_id uuid)
returns table (outcome text, at timestamptz, also_checked_in boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
  v_at timestamptz;
  v_checked boolean := false;
begin
  if p_station_id is not null and not exists (select 1 from public.event_stations s where s.id = p_station_id and s.event_id = p_event_id) then
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

  if v_reg.checked_in_at is null then
    update public.event_registrations set checked_in_at = now() where id = v_reg.id;
    v_checked := true;
  end if;

  if p_station_id is null then
    return query select case when v_checked then 'checked_in' else 'already_checked_in' end,
      case when v_checked then now() else v_reg.checked_in_at end, false;
    return;
  end if;

  insert into public.station_scans (station_id, registration_id, scanned_by)
  values (p_station_id, v_reg.id, public.current_email())
  on conflict do nothing
  returning scanned_at into v_at;

  if v_at is not null then
    return query select 'served', v_at, v_checked;
  else
    select s.scanned_at into v_at from public.station_scans s where s.station_id = p_station_id and s.registration_id = v_reg.id;
    return query select 'already_served', v_at, false;
  end if;
end;
$$;

revoke execute on function public.scan_registration(uuid, uuid, uuid) from public, anon, authenticated;

-- A member card. Outcomes: checked_in, already_checked_in, served, already_served,
-- unpaid, no_rsvp, waitlisted, cancelled, unknown_member, wrong_station. Error: not_allowed.
drop function public.scan_at_event(uuid, uuid, uuid);
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
    from public.scan_registration(v_reg_id, p_event_id, p_station_id) s;
end;
$$;

-- A ticket (its code, e.g. JT-7K3M9Q). Only valid at its own event: another event's
-- ticket comes back as wrong_event. Same outcomes otherwise, plus unknown_ticket.
create function public.scan_ticket(p_ticket_code text, p_event_id uuid, p_station_id uuid default null)
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
    from public.scan_registration(v_reg.id, p_event_id, p_station_id) s;
end;
$$;

revoke execute on function public.scan_at_event(uuid, uuid, uuid) from public, anon;
revoke execute on function public.scan_ticket(text, uuid, uuid) from public, anon;
grant execute on function public.scan_at_event(uuid, uuid, uuid) to authenticated;
grant execute on function public.scan_ticket(text, uuid, uuid) to authenticated;
revoke execute on function public.event_registration_defaults() from public, anon, authenticated;
revoke execute on function public.new_ticket_code() from public, anon, authenticated;
