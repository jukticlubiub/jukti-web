-- The public members list on the Team Jukti page.
--
-- Every approved member is listed (name, department, intake and photo only), including
-- members imported from the registration app who haven't signed in yet. A member can
-- hide themselves from it on their profile. Needs 20261006120000_members.sql.

alter table public.members
  add column if not exists hide_from_public boolean not null default false;

-- Public fields only. `intake` is the first 3 digits of the IUB ID (year and term),
-- never the full ID.
create function public.public_members()
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
  where i.claimed_at is null
  order by 1;
$$;

revoke execute on function public.public_members() from public;
grant execute on function public.public_members() to anon, authenticated;

-- Profile edits: as before, plus the public-list switch.
create or replace function public.update_my_profile(p jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.members;
  v_bio text := public.member_text(p, 'bio', 500);
  v_linkedin text := public.member_text(p, 'linkedin', 300);
  v_github text := public.member_text(p, 'github', 300);
  v_skills text[] := public.member_list(p, 'skills');
  v_method text := public.member_text(p, 'payment_method', 10);
  v_txn text := upper(public.member_text(p, 'bkash_transaction_id', 20));
  v_sender text := public.member_text(p, 'bkash_sender_number', 20);
  v_exec text := public.member_text(p, 'executive_id', 40);
  v_status text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_row from public.members where id = v_user;
  if not found then raise exception 'not_registered'; end if;

  perform public.check_member_fields(p);
  if v_bio is not null and length(v_bio) > 500 then raise exception 'invalid_bio'; end if;
  if (v_linkedin is not null and (length(v_linkedin) > 300 or v_linkedin !~* '^https://([a-z]+\.)?linkedin\.com/'))
     or (v_github is not null and (length(v_github) > 300 or v_github !~* '^https://(www\.)?github\.com/')) then
    raise exception 'invalid_link';
  end if;
  if cardinality(v_skills) > 15 or exists (select 1 from unnest(v_skills) s where length(s) > 40) then
    raise exception 'too_many_skills';
  end if;

  v_status := v_row.status;
  if v_row.status = 'rejected' and v_method is not null then
    perform public.check_member_payment(v_method, v_txn, v_sender, v_exec);
    if v_method = 'Cash' then
      v_txn := null;
      v_sender := null;
    end if;
    v_status := 'pending';
  end if;

  update public.members set
    name = public.member_text(p, 'name', 80),
    department = public.member_text(p, 'department', 80),
    residence_area = public.member_text(p, 'residence_area', 120),
    contact_number = public.member_text(p, 'contact_number', 20),
    facebook_link = public.member_text(p, 'facebook_link', 300),
    blood_group = public.member_text(p, 'blood_group', 3),
    fields_of_interest = public.member_list(p, 'fields_of_interest'),
    co_curricular = public.member_list(p, 'co_curricular'),
    secondary_email = lower(public.member_text(p, 'secondary_email', 254)),
    photo_url = public.member_text(p, 'photo_url', 500),
    bio = v_bio,
    linkedin = v_linkedin,
    github = v_github,
    skills = v_skills,
    show_in_directory = coalesce((p ->> 'show_in_directory')::boolean, false),
    hide_from_public = coalesce((p ->> 'hide_from_public')::boolean, false),
    status = v_status,
    payment_method = case when v_status <> v_row.status then v_method else payment_method end,
    bkash_transaction_id = case when v_status <> v_row.status then v_txn else bkash_transaction_id end,
    bkash_sender_number = case when v_status <> v_row.status then v_sender else bkash_sender_number end,
    executive_id = case when v_status <> v_row.status then v_exec else executive_id end
  where id = v_user;
  return v_status;
end;
$$;
