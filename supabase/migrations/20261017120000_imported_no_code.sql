-- Members imported from the old registration app paid and were verified there: they're never
-- asked for an executive's code, even if sent back to fix their payment details.
-- Needs 20261016120000_member_verification.sql.

-- Whether the signed-in member came from the registration app (claimed an imported membership).
create or replace function public.is_imported_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.member_imports where claimed_by = auth.uid());
$$;

grant execute on function public.is_imported_member() to authenticated;

-- As before, except that imported members skip the code.
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
  if not public.executive_code_required() or public.is_imported_member() then return; end if;
  if p_exec is null then raise exception 'executive_required'; end if;
  if exists (select 1 from public.executives where active)
     and not exists (select 1 from public.executives where code = p_exec and active) then
    raise exception 'invalid_executive';
  end if;
end;
$$;

-- As before, except that resubmitting without a code (imported members, or while the code is
-- switched off) keeps the executive already on record instead of clearing it.
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
    executive_id = case when v_status <> v_row.status then coalesce(v_exec, executive_id) else executive_id end
  where id = v_user;
  return v_status;
end;
$$;
