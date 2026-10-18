-- RSVP: a Facebook profile link field (prefilled from a member's profile, typed in otherwise).
-- register_for_event accepts and validates the 'facebook' key, and saves it to the member's profile. Needs 20261019120000_rsvp_fields.sql.

create or replace function public.register_for_event(p_event_id uuid, p_full_name text, p_student_id text, p_answers jsonb default '{}'::jsonb)
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
  v_in jsonb := case when jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) = 'object' then p_answers else '{}'::jsonb end;
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_cfg text;
  v_val text;
  v_q jsonb;
  v_qid text;
  v_type text;
  v_required boolean;
  v_str text;
  v_arr jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

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

  -- IUB-only events need an @iub.edu.bd sign-in.
  if v_event.audience = 'iub' and lower(v_email) !~ '@iub\.edu\.bd$' then
    raise exception 'iub_only' using errcode = '42501';
  end if;

  -- Name.
  p_full_name := btrim(coalesce(p_full_name, ''));
  if char_length(p_full_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  -- Student ID (its own column). Empty is filled from an IUB student email; anything given is 7 digits.
  p_student_id := nullif(btrim(coalesce(p_student_id, '')), '');
  if p_student_id is null and lower(v_email) ~ '^[0-9]{7}@iub\.edu\.bd$' then
    p_student_id := split_part(v_email, '@', 1);
  end if;
  if p_student_id is not null and p_student_id !~ '^[0-9]{7}$' then
    raise exception 'invalid_student_id' using errcode = '22023';
  end if;
  if (v_event.rsvp_fields ->> 'student_id') = 'required' and p_student_id is null then
    raise exception 'invalid_fields' using errcode = '22023';
  end if;

  -- Standard optional fields (department / phone / blood_group), per the event's config.
  for v_key, v_cfg in select key, value from jsonb_each_text(coalesce(v_event.rsvp_fields, '{}'::jsonb)) loop
    if v_key not in ('department', 'phone', 'blood_group', 'facebook') then
      continue;
    end if;
    v_val := nullif(btrim(coalesce(v_in ->> v_key, '')), '');
    if v_val is null then
      if v_cfg = 'required' then raise exception 'invalid_fields' using errcode = '22023'; end if;
      continue;
    end if;
    if v_key = 'phone' and v_val !~ '^(\+?88)?01[3-9][0-9]{8}$' then raise exception 'invalid_fields' using errcode = '22023'; end if;
    if v_key = 'blood_group' and v_val not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') then raise exception 'invalid_fields' using errcode = '22023'; end if;
    if v_key = 'facebook' and (char_length(v_val) > 300 or v_val !~* '^https://([a-z0-9-]+\.)?(facebook\.com|fb\.com)/') then raise exception 'invalid_fields' using errcode = '22023'; end if;
    if v_key <> 'facebook' and char_length(v_val) > 120 then raise exception 'invalid_fields' using errcode = '22023'; end if;
    v_out := v_out || jsonb_build_object(v_key, v_val);
  end loop;

  -- Custom questions.
  for v_q in select jsonb_array_elements(coalesce(v_event.rsvp_questions, '[]'::jsonb)) loop
    v_qid := v_q ->> 'id';
    v_type := coalesce(v_q ->> 'type', 'short');
    v_required := coalesce((v_q ->> 'required')::boolean, false);
    if v_qid is null then continue; end if;

    if v_type = 'checkbox' then
      v_arr := case when jsonb_typeof(v_in -> v_qid) = 'array' then v_in -> v_qid else '[]'::jsonb end;
      if jsonb_array_length(v_arr) = 0 then
        if v_required then raise exception 'invalid_fields' using errcode = '22023'; end if;
      else
        if exists (
          select 1 from jsonb_array_elements_text(v_arr) e
          where not (coalesce(v_q -> 'options', '[]'::jsonb) ? e)
        ) then
          raise exception 'invalid_fields' using errcode = '22023';
        end if;
        v_out := v_out || jsonb_build_object(v_qid, v_arr);
      end if;
    else
      v_str := nullif(btrim(coalesce(v_in ->> v_qid, '')), '');
      if v_str is null then
        if v_required then raise exception 'invalid_fields' using errcode = '22023'; end if;
      else
        if char_length(v_str) > 2000 then raise exception 'invalid_fields' using errcode = '22023'; end if;
        if v_type = 'select' and not (coalesce(v_q -> 'options', '[]'::jsonb) ? v_str) then
          raise exception 'invalid_fields' using errcode = '22023';
        end if;
        v_out := v_out || jsonb_build_object(v_qid, to_jsonb(v_str));
      end if;
    end if;
  end loop;

  if char_length(v_out::text) > 8000 then
    raise exception 'invalid_fields' using errcode = '22023';
  end if;

  select r.status into v_current
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = v_user;

  if v_current in ('registered', 'waitlisted') then
    update public.event_registrations r
    set full_name = p_full_name, student_id = p_student_id, email = v_email, answers = v_out
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
      (event_id, user_id, full_name, email, student_id, answers, status, queued_at)
    values (p_event_id, v_user, p_full_name, v_email, p_student_id, v_out, v_status, now())
    on conflict (event_id, user_id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          student_id = excluded.student_id,
          answers = excluded.answers,
          status = excluded.status,
          queued_at = excluded.queued_at,
          checked_in_at = null;
  end if;

  -- Save the Facebook link to their member profile too (members only; just this field).
  if v_out ? 'facebook' then
    update public.members m set facebook_link = v_out ->> 'facebook'
    where m.id = v_user and m.facebook_link is distinct from (v_out ->> 'facebook');
  end if;

  return public.my_event_registration(p_event_id);
end;
$$;
