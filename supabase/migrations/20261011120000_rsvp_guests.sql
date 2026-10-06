-- Guests from outside IUB can RSVP: the student ID is optional. Signed in with an IUB
-- student email (2412345@iub.edu.bd), it's taken from the email when left empty.
-- Needs 20261010120000_event_tickets.sql.

alter table public.event_registrations alter column student_id drop not null;

-- As before, except the student ID: empty is fine (filled from an IUB student email),
-- anything given must be 7 digits. Errors: not_authenticated, invalid_name,
-- invalid_student_id, event_not_found, rsvp_not_enabled, rsvp_closed.
create or replace function public.register_for_event(p_event_id uuid, p_full_name text, p_student_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_event public.events%rowtype;
  v_current text;
  v_taken integer;
  v_status text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  p_full_name := btrim(coalesce(p_full_name, ''));
  p_student_id := nullif(btrim(coalesce(p_student_id, '')), '');
  if char_length(p_full_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if p_student_id is null and lower(v_email) ~ '^[0-9]{7}@iub\.edu\.bd$' then
    p_student_id := split_part(v_email, '@', 1);
  end if;
  -- IUB student IDs are 7 digits.
  if p_student_id is not null and p_student_id !~ '^[0-9]{7}$' then
    raise exception 'invalid_student_id' using errcode = '22023';
  end if;

  -- Lock the event row so sign-ups for the last seat are handled one at a time.
  select * into v_event from public.events where id = p_event_id and published for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if not v_event.rsvp_enabled then
    raise exception 'rsvp_not_enabled' using errcode = '22023';
  end if;
  if now() >= coalesce(v_event.rsvp_deadline, v_event.starts_at) then
    raise exception 'rsvp_closed' using errcode = '22023';
  end if;

  select r.status into v_current
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = v_user;

  if v_current in ('registered', 'waitlisted') then
    update public.event_registrations r
    set full_name = p_full_name, student_id = p_student_id, email = v_email
    where r.event_id = p_event_id and r.user_id = v_user;
  else
    select count(*) into v_taken
    from public.event_registrations r
    where r.event_id = p_event_id and r.status = 'registered';

    v_status := case
      when v_event.capacity is null or v_taken < v_event.capacity then 'registered'
      else 'waitlisted'
    end;

    insert into public.event_registrations as r
      (event_id, user_id, full_name, email, student_id, status, queued_at)
    values (p_event_id, v_user, p_full_name, v_email, p_student_id, v_status, now())
    on conflict (event_id, user_id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          student_id = excluded.student_id,
          status = excluded.status,
          queued_at = excluded.queued_at,
          checked_in_at = null;
  end if;

  return public.my_event_registration(p_event_id);
end;
$$;
