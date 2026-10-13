-- Two registration rules (Admin > Members). Needs 20261014120000_registration_toggle.sql.
--
-- 1. The executive code can be switched off. Stored in site_settings as
--    'members.verification' = {"required": true|false}; with no row, the code is required.
--    Membership Managers may change it, besides the Master Admin. While it's off, the code
--    is neither asked for nor checked (registering, and a rejected member fixing payment).
-- 2. A photo is required: registering, and saving your profile (both run
--    check_member_fields; claiming an imported membership doesn't). New error: photo_required.

create or replace function public.executive_code_required()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (s.value ->> 'required')::boolean from public.site_settings s where s.key = 'members.verification'), true);
$$;

grant execute on function public.executive_code_required() to anon, authenticated;

drop policy "Masters and managers manage settings" on public.site_settings;
-- The board term is the Team Manager's, registration and verification the Membership Manager's;
-- everything else the master admin's.
create policy "Masters and managers manage settings" on public.site_settings for all to authenticated
  using (
    (select public.is_master())
    or (key = 'team.board_term' and (select public.has_role('team_manager')))
    or (key in ('members.registration', 'members.verification') and (select public.has_role('membership_manager')))
  )
  with check (
    (select public.is_master())
    or (key = 'team.board_term' and (select public.has_role('team_manager')))
    or (key in ('members.registration', 'members.verification') and (select public.has_role('membership_manager')))
  );

-- As before, except that the executive code is only required (and checked) while verification is on.
create or replace function public.check_member_payment(p_method text, p_txn text, p_sender text, p_exec text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_method is null or p_method not in ('Bkash', 'Cash') then raise exception 'invalid_payment'; end if;
  if p_method = 'Bkash' and (p_sender is null or p_sender !~ '^(\+?88)?01[3-9][0-9]{8}$'
                             or (p_txn is not null and p_txn !~ '^[A-Z0-9]{8,12}$')) then
    raise exception 'invalid_payment';
  end if;
  if not public.executive_code_required() then return; end if;
  if p_exec is null then raise exception 'executive_required'; end if;
  if exists (select 1 from public.executives where active)
     and not exists (select 1 from public.executives where code = p_exec and active) then
    raise exception 'invalid_executive';
  end if;
end;
$$;

-- As before, except that a photo is required (new error: photo_required).
create or replace function public.check_member_fields(p jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  v := public.member_text(p, 'name', 80);
  if v is null or length(v) < 2 or length(v) > 80 then raise exception 'invalid_name'; end if;
  v := public.member_text(p, 'department', 80);
  if v is null or length(v) > 80 then raise exception 'invalid_department'; end if;
  v := public.member_text(p, 'residence_area', 120);
  if v is null or length(v) > 120 then raise exception 'invalid_residence'; end if;
  v := public.member_text(p, 'contact_number', 20);
  if v is null or v !~ '^(\+?88)?01[3-9][0-9]{8}$' then raise exception 'invalid_phone'; end if;
  v := public.member_text(p, 'facebook_link', 300);
  if v is not null and (length(v) > 300 or v !~* '^https://([a-z0-9-]+\.)?(facebook\.com|fb\.com)/') then raise exception 'invalid_facebook'; end if;
  v := public.member_text(p, 'blood_group', 3);
  if v is not null and v not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') then raise exception 'invalid_blood_group'; end if;
  v := lower(public.member_text(p, 'secondary_email', 254));
  if v is null or length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_secondary_email'; end if;
  if v like '%@iub.edu.bd' then raise exception 'secondary_email_is_iub'; end if;
  v := public.member_text(p, 'photo_url', 500);
  if v is null then raise exception 'photo_required'; end if;
  if length(v) > 500 or v !~ '^https://' then raise exception 'invalid_photo'; end if;
  if cardinality(public.member_list(p, 'fields_of_interest')) > 12 or cardinality(public.member_list(p, 'co_curricular')) > 12 then
    raise exception 'too_many_choices';
  end if;
end;
$$;
