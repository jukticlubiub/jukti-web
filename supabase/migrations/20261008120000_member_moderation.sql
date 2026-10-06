-- Admin control over the member features: executive codes, moderating what members
-- show publicly (photo, name, bio, the public list and the directory), and fixing or
-- removing imported members. All for Membership Managers (and Master Admins).
-- Needs 20261007120000_public_members.sql.

-- ---------------------------------------------------------------------------
-- Executive codes: Membership Managers add them and switch them off
-- ---------------------------------------------------------------------------

create policy "Membership managers manage executives"
  on public.executives for all to authenticated
  using ((select public.has_role('membership_manager')))
  with check ((select public.has_role('membership_manager')));

grant insert, update, delete on public.executives to authenticated;

create trigger executives_audit after insert or update or delete on public.executives
  for each row execute function public.log_admin_change();

-- ---------------------------------------------------------------------------
-- Moderating a member's public profile. Only what others see: the name and department
-- (typos), taking them off the public list or the directory, removing their photo or bio.
-- Errors: not_allowed, not_found, invalid_name.
-- ---------------------------------------------------------------------------

create function public.moderate_member(p_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p ->> 'name', '')), '');
  v_department text := nullif(btrim(coalesce(p ->> 'department', '')), '');
begin
  if not public.has_role('membership_manager') then raise exception 'not_allowed'; end if;
  if v_name is not null and (length(v_name) < 2 or length(v_name) > 80) then raise exception 'invalid_name'; end if;
  update public.members set
    name = coalesce(v_name, name),
    department = coalesce(left(v_department, 80), department),
    hide_from_public = coalesce((p ->> 'hide_from_public')::boolean, hide_from_public),
    -- Admins can take someone out of the directory, not put them in (that's their choice).
    show_in_directory = show_in_directory and coalesce((p ->> 'show_in_directory')::boolean, true),
    photo_url = case when coalesce((p ->> 'remove_photo')::boolean, false) then null else photo_url end,
    bio = case when coalesce((p ->> 'clear_bio')::boolean, false) then null else bio end
  where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$$;

revoke execute on function public.moderate_member(uuid, jsonb) from public, anon;
grant execute on function public.moderate_member(uuid, jsonb) to authenticated;

-- Membership Managers can delete a member's photo file when they remove it.
create policy "Membership managers remove member photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (select public.has_role('membership_manager')));

-- ---------------------------------------------------------------------------
-- Imported members (not signed in yet): fix the name or department, hide them from
-- the public list, or remove a wrong entry.
-- ---------------------------------------------------------------------------

alter table public.member_imports
  add column if not exists hide_from_public boolean not null default false;

create policy "Membership managers edit imported members"
  on public.member_imports for update to authenticated
  using ((select public.has_role('membership_manager')))
  with check ((select public.has_role('membership_manager')));

create policy "Membership managers remove imported members"
  on public.member_imports for delete to authenticated
  using ((select public.has_role('membership_manager')) and claimed_at is null);

grant update (name, department, hide_from_public) on public.member_imports to authenticated;
grant delete on public.member_imports to authenticated;

create trigger member_imports_audit after insert or update or delete on public.member_imports
  for each row execute function public.log_admin_change();

-- The public list leaves out hidden imports too.
create or replace function public.public_members()
returns table (name text, department text, intake text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select btrim(m.name), m.department, left(m.iub_id, 3), m.photo_url
  from public.members m
  where m.status = 'approved' and not m.hide_from_public and nullif(btrim(m.name), '') is not null
  union all
  select btrim(i.name), i.department, left(i.iub_id, 3), null
  from public.member_imports i
  where i.claimed_at is null and not i.hide_from_public
  order by 1;
$$;

-- Claiming keeps an admin's choice to hide them.
create or replace function public.claim_member_import()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := public.current_email();
  v_import public.member_imports;
begin
  if v_user is null or v_email is null then
    return null;
  end if;
  if exists (select 1 from public.members where id = v_user) then
    return 'member';
  end if;
  select * into v_import from public.member_imports where email = v_email and claimed_at is null for update;
  if not found then
    return null;
  end if;

  insert into public.members (
    id, email, name, iub_id, department, semester, residence_area, contact_number, facebook_link,
    blood_group, notes, payment_method, bkash_transaction_id, bkash_sender_number, executive_id,
    fields_of_interest, co_curricular, created_at, status, approved_at, approved_by, member_no, hide_from_public
  ) values (
    v_user, v_email, v_import.name, coalesce(v_import.iub_id, split_part(v_email, '@', 1)), v_import.department,
    v_import.semester, v_import.residence_area, v_import.contact_number, v_import.facebook_link,
    v_import.blood_group, v_import.notes, v_import.payment_method, v_import.bkash_transaction_id,
    v_import.bkash_sender_number, v_import.executive, v_import.fields_of_interest, v_import.co_curricular,
    v_import.registered_at, 'approved', v_import.registered_at, 'jukti-reg import', v_import.member_no, v_import.hide_from_public
  );
  update public.member_imports set claimed_by = v_user, claimed_at = now() where email = v_email;
  return 'claimed';
end;
$$;
