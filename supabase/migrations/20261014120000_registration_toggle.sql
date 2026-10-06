-- Opening and closing member registration (Admin > Members). Stored in site_settings as
-- 'members.registration' = {"open": true|false}; with no row, registration is open.
-- Membership Managers may change it, besides the Master Admin. Needs 20261006120000_members.sql.

create or replace function public.registration_open()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (s.value ->> 'open')::boolean from public.site_settings s where s.key = 'members.registration'), true);
$$;

grant execute on function public.registration_open() to anon, authenticated;

drop policy "Masters and team managers manage settings" on public.site_settings;
-- The board term is the Team Manager's, registration the Membership Manager's; everything else the master admin's.
create policy "Masters and managers manage settings" on public.site_settings for all to authenticated
  using (
    (select public.is_master())
    or (key = 'team.board_term' and (select public.has_role('team_manager')))
    or (key = 'members.registration' and (select public.has_role('membership_manager')))
  )
  with check (
    (select public.is_master())
    or (key = 'team.board_term' and (select public.has_role('team_manager')))
    or (key = 'members.registration' and (select public.has_role('membership_manager')))
  );

-- register_member, unchanged except that it refuses while registration is closed
-- (new error: registration_closed).
create or replace function public.register_member(p jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := public.current_email();
  v_iub_id text;
  v_method text := public.member_text(p, 'payment_method', 10);
  v_txn text := upper(public.member_text(p, 'bkash_transaction_id', 20));
  v_sender text := public.member_text(p, 'bkash_sender_number', 20);
  v_exec text := public.member_text(p, 'executive_id', 40);
begin
  if v_user is null or v_email is null then raise exception 'not_authenticated'; end if;
  if not public.registration_open() then raise exception 'registration_closed'; end if;
  v_iub_id := split_part(v_email, '@', 1);
  if v_email not like '%@iub.edu.bd' or v_iub_id !~ '^[0-9]{7}$' then raise exception 'not_iub_student'; end if;
  if exists (select 1 from public.members where id = v_user) then raise exception 'already_registered'; end if;

  perform public.check_member_fields(p);
  perform public.check_member_payment(v_method, v_txn, v_sender, v_exec);
  if v_method = 'Cash' then
    v_txn := null;
    v_sender := null;
  end if;

  insert into public.members (
    id, email, name, iub_id, department, semester, residence_area, contact_number, facebook_link,
    blood_group, notes, payment_method, bkash_transaction_id, bkash_sender_number, executive_id,
    fields_of_interest, co_curricular, secondary_email, photo_url, status
  ) values (
    v_user, v_email, public.member_text(p, 'name', 80), v_iub_id, public.member_text(p, 'department', 80),
    public.member_text(p, 'semester', 10), public.member_text(p, 'residence_area', 120),
    public.member_text(p, 'contact_number', 20), public.member_text(p, 'facebook_link', 300),
    public.member_text(p, 'blood_group', 3), left(public.member_text(p, 'notes', 1000), 1000), v_method, v_txn, v_sender, v_exec,
    public.member_list(p, 'fields_of_interest'), public.member_list(p, 'co_curricular'),
    lower(public.member_text(p, 'secondary_email', 254)), public.member_text(p, 'photo_url', 500), 'pending'
  );
  return 'pending';
end;
$$;
