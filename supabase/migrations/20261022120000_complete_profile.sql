-- Imported members (from the registration app) become members on their first sign-in, but the
-- import has no photo or personal email (and a few have no valid phone). When they RSVP, the
-- form asks for just what's missing and saves it here, so they finish signing up and RSVP at once.
--
-- complete_my_profile only fills gaps: a field the member already has is never overwritten
-- (they change those on /account). Afterwards every required field must be present.
-- Errors: not_authenticated, not_registered, invalid_department, invalid_residence, invalid_phone,
-- invalid_secondary_email, secondary_email_is_iub, photo_required, invalid_photo.
-- Needs 20261016120000_member_verification.sql.

create function public.complete_my_profile(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.members;
  v_department text;
  v_residence text;
  v_phone text;
  v_secondary text;
  v_photo text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_row from public.members where id = v_user for update;
  if not found then raise exception 'not_registered'; end if;

  v_department := coalesce(nullif(btrim(coalesce(v_row.department, '')), ''), public.member_text(p, 'department', 80));
  if v_department is null or length(v_department) > 80 then raise exception 'invalid_department'; end if;

  v_residence := coalesce(nullif(btrim(coalesce(v_row.residence_area, '')), ''), public.member_text(p, 'residence_area', 120));
  if v_residence is null or length(v_residence) > 120 then raise exception 'invalid_residence'; end if;

  v_phone := case
    when coalesce(v_row.contact_number, '') ~ '^(\+?88)?01[3-9][0-9]{8}$' then v_row.contact_number
    else public.member_text(p, 'contact_number', 20)
  end;
  if v_phone is null or v_phone !~ '^(\+?88)?01[3-9][0-9]{8}$' then raise exception 'invalid_phone'; end if;

  v_secondary := coalesce(nullif(btrim(coalesce(v_row.secondary_email, '')), ''), lower(public.member_text(p, 'secondary_email', 254)));
  if v_secondary is null or length(v_secondary) > 254 or v_secondary !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_secondary_email'; end if;
  if v_secondary like '%@iub.edu.bd' then raise exception 'secondary_email_is_iub'; end if;

  v_photo := coalesce(nullif(btrim(coalesce(v_row.photo_url, '')), ''), public.member_text(p, 'photo_url', 500));
  if v_photo is null then raise exception 'photo_required'; end if;
  if length(v_photo) > 500 or v_photo !~ '^https://' then raise exception 'invalid_photo'; end if;

  update public.members set
    department = v_department,
    residence_area = v_residence,
    contact_number = v_phone,
    secondary_email = v_secondary,
    photo_url = v_photo
  where id = v_user
    and (department, residence_area, contact_number, secondary_email, photo_url)
        is distinct from (v_department, v_residence, v_phone, v_secondary, v_photo);
end;
$$;

revoke execute on function public.complete_my_profile(jsonb) from public, anon;
grant execute on function public.complete_my_profile(jsonb) to authenticated;
