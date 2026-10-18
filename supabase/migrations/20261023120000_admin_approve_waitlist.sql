-- Event Managers can give a waitlisted person a seat by hand (the admin RSVP list's "Approve"),
-- even when that takes the event over its capacity: they decide, e.g. a bigger room or a no-show.
-- The event row is locked like the other seat changes, so it can't race a cancel's auto-promotion.
-- Returns the event's registered count and capacity afterwards.
-- Errors: not_allowed, registration_not_found, not_waitlisted. Needs 20261004120000_admin.sql.

create function public.admin_approve_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations%rowtype;
  v_event public.events%rowtype;
  v_taken integer;
begin
  if not public.has_role('event_manager') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_reg from public.event_registrations where id = p_registration_id;
  if not found then
    raise exception 'registration_not_found' using errcode = 'P0002';
  end if;
  select * into v_event from public.events where id = v_reg.event_id for update;

  update public.event_registrations set status = 'registered'
  where id = p_registration_id and status = 'waitlisted';
  if not found then
    raise exception 'not_waitlisted' using errcode = '22023';
  end if;

  select count(*) into v_taken from public.event_registrations r
  where r.event_id = v_reg.event_id and r.status = 'registered';
  return jsonb_build_object('registered', v_taken, 'capacity', v_event.capacity);
end;
$$;

revoke execute on function public.admin_approve_registration(uuid) from public, anon;
grant execute on function public.admin_approve_registration(uuid) to authenticated;
