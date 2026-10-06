-- Member accounts on the website.
--
-- The registration app (Jukti Reg) keeps its members in its own Supabase project.
-- This creates the same `members` table here (or extends it, if this migration is run
-- where that table already exists), and a `member_imports` table that the registration
-- app's CSV export is loaded into (scripts/members-import.mjs). Each imported member is
-- matched to their account the first time they sign in with their IUB email.
-- Needs every earlier migration.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The registration app's table, as its form writes it (same columns, so both agree).
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  iub_id text,
  department text,
  semester text,
  residence_area text,
  contact_number text,
  facebook_link text,
  blood_group text,
  notes text,
  payment_method text,
  bkash_transaction_id text,
  bkash_sender_number text,
  executive_id text,
  fields_of_interest text[],
  co_curricular text[]
);
alter table public.members enable row level security;

-- Members read their own row (the registration app has its own policy for this).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname in ('members select own', 'Members read their own row')) then
    create policy "Members read their own row" on public.members for select to authenticated using (id = (select auth.uid()));
  end if;
end;
$$;
grant select on public.members to authenticated;

-- Executive codes: an executive gives one to each member once they've paid. The
-- registration app's admin setup creates the same table.
create table if not exists public.executives (
  code text primary key,
  name text not null,
  active boolean not null default true
);
alter table public.executives enable row level security;

alter table public.members
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists review_note text,
  add column if not exists member_no text,
  -- A non-IUB address, for after graduation (IUB email access ends).
  add column if not exists secondary_email text,
  add column if not exists photo_url text,
  add column if not exists bio text,
  add column if not exists linkedin text,
  add column if not exists github text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists show_in_directory boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.members
  add constraint members_status_check check (status in ('pending', 'approved', 'rejected', 'lapsed'));

create unique index if not exists members_member_no_idx on public.members (member_no) where member_no is not null;
create index if not exists members_status_idx on public.members (status, created_at);

create trigger members_touch_updated_at
  before update on public.members
  for each row execute function public.touch_updated_at();

-- Anyone already in the table (where it existed before, from the registration app) is a member.
update public.members
set status = 'approved', approved_at = coalesce(created_at, now()), approved_by = 'jukti-reg import'
where status = 'pending';

-- Member numbers, e.g. JKT-26-0127: the year they were approved, then a running count.
create sequence public.member_no_seq;

with ordered as (
  select id, approved_at, row_number() over (order by created_at, id) as n
  from public.members
  where status = 'approved' and member_no is null
)
update public.members m
set member_no = 'JKT-' || to_char(o.approved_at at time zone 'Asia/Dhaka', 'YY') || '-' || lpad(o.n::text, 4, '0')
from ordered o
where m.id = o.id;

select setval('public.member_no_seq', greatest((select count(*) from public.members where member_no is not null), 1),
              (select count(*) from public.members where member_no is not null) > 0);

-- ---------------------------------------------------------------------------
-- Imported members: the registration app's CSV export, loaded by
-- scripts/members-import.mjs. Numbered in registration order as they're loaded, and
-- turned into members when they first sign in here (claim_member_import).
-- ---------------------------------------------------------------------------

create table public.member_imports (
  email text primary key check (email = lower(email)),
  name text not null,
  iub_id text,
  department text,
  semester text,
  residence_area text,
  contact_number text,
  facebook_link text,
  blood_group text,
  notes text,
  payment_method text,
  bkash_transaction_id text,
  bkash_sender_number text,
  -- The export has the executive's name, not their code.
  executive text,
  fields_of_interest text[] not null default '{}',
  co_curricular text[] not null default '{}',
  registered_at timestamptz not null,
  member_no text unique,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  imported_at timestamptz not null default now()
);

alter table public.member_imports enable row level security;
create policy "Membership managers read imported members" on public.member_imports for select to authenticated
  using ((select public.has_role('membership_manager')));
revoke all on public.member_imports from anon;
grant select on public.member_imports to authenticated;

create function public.number_member_import()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_no is null then
    new.member_no := 'JKT-' || to_char(new.registered_at at time zone 'Asia/Dhaka', 'YY') || '-' || lpad(nextval('public.member_no_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger member_imports_number before insert on public.member_imports
  for each row execute function public.number_member_import();

-- On sign-in: if the signed-in user's email was imported and they aren't a member here
-- yet, they become one (approved, with their number). Returns 'claimed', 'member'
-- (already one), or null (nothing to claim).
create function public.claim_member_import()
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
    fields_of_interest, co_curricular, created_at, status, approved_at, approved_by, member_no
  ) values (
    v_user, v_email, v_import.name, coalesce(v_import.iub_id, split_part(v_email, '@', 1)), v_import.department,
    v_import.semester, v_import.residence_area, v_import.contact_number, v_import.facebook_link,
    v_import.blood_group, v_import.notes, v_import.payment_method, v_import.bkash_transaction_id,
    v_import.bkash_sender_number, v_import.executive, v_import.fields_of_interest, v_import.co_curricular,
    v_import.registered_at, 'approved', v_import.registered_at, 'jukti-reg import', v_import.member_no
  );
  update public.member_imports set claimed_by = v_user, claimed_at = now() where email = v_email;
  return 'claimed';
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard: direct writes from the browser (the registration app inserts directly)
-- can't approve themselves or change what a member may not.
-- Invoker rights on purpose: the website's RPCs run as the owner and are trusted.
-- ---------------------------------------------------------------------------

create function public.members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.approved_at := null;
    new.approved_by := null;
    new.review_note := null;
    new.member_no := null;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.iub_id is distinct from old.iub_id
     or new.status is distinct from old.status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.review_note is distinct from old.review_note
     or new.member_no is distinct from old.member_no
     or new.payment_method is distinct from old.payment_method
     or new.bkash_transaction_id is distinct from old.bkash_transaction_id
     or new.bkash_sender_number is distinct from old.bkash_sender_number
     or new.executive_id is distinct from old.executive_id then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$$;

create trigger members_guard
  before insert or update on public.members
  for each row execute function public.members_guard();

-- ---------------------------------------------------------------------------
-- Roles: Membership Manager approves members and sees their registration details
-- ---------------------------------------------------------------------------

alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('master_admin', 'event_manager', 'pr_editor', 'academic_coordinator', 'team_manager', 'membership_manager'));

create policy "Membership managers read members"
  on public.members for select to authenticated
  using ((select public.has_role('membership_manager')));

create policy "Membership managers read executives"
  on public.executives for select to authenticated
  using ((select public.has_role('membership_manager')));

grant select on public.executives to authenticated;

-- ---------------------------------------------------------------------------
-- Validation helpers
-- ---------------------------------------------------------------------------

create function public.member_text(p jsonb, p_key text, p_max int)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(coalesce(p ->> p_key, '')), p_max + 1), '');
$$;

create function public.member_list(p jsonb, p_key text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(left(btrim(v), 80)) filter (where btrim(v) <> ''), '{}')
  from jsonb_array_elements_text(case when jsonb_typeof(p -> p_key) = 'array' then p -> p_key else '[]'::jsonb end) as v;
$$;

-- Checks the fields a member fills in (on registration and when editing). Raises the
-- first problem as the error message.
create function public.check_member_fields(p jsonb)
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
  if v is not null and (length(v) > 500 or v !~ '^https://') then raise exception 'invalid_photo'; end if;
  if cardinality(public.member_list(p, 'fields_of_interest')) > 12 or cardinality(public.member_list(p, 'co_curricular')) > 12 then
    raise exception 'too_many_choices';
  end if;
end;
$$;

-- The payment details, as the registration app takes them: bKash needs the sender number
-- (the transaction ID is optional), and either way an executive gives the member a code
-- once the fee is paid. The code is checked here, on the server (the registration app only
-- checks it in the browser). Errors: invalid_payment, executive_required, invalid_executive.
create function public.check_member_payment(p_method text, p_txn text, p_sender text, p_exec text)
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
  if p_exec is null then raise exception 'executive_required'; end if;
  if exists (select 1 from public.executives where active)
     and not exists (select 1 from public.executives where code = p_exec and active) then
    raise exception 'invalid_executive';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registering (website sign-ups; the registration app still inserts directly)
-- ---------------------------------------------------------------------------

-- Errors: not_authenticated, not_iub_student, already_registered, the field errors above,
-- and the payment errors above. Returns the new status ('pending').
create function public.register_member(p jsonb)
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

-- ---------------------------------------------------------------------------
-- Editing your own profile. A rejected member may also correct their payment
-- details, which sends the application back for review.
-- Errors: not_registered, the field errors above, invalid_bio, invalid_link,
-- too_many_skills, and the payment errors above.
-- ---------------------------------------------------------------------------

create function public.update_my_profile(p jsonb)
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
    status = v_status,
    payment_method = case when v_status <> v_row.status then v_method else payment_method end,
    bkash_transaction_id = case when v_status <> v_row.status then v_txn else bkash_transaction_id end,
    bkash_sender_number = case when v_status <> v_row.status then v_sender else bkash_sender_number end,
    executive_id = case when v_status <> v_row.status then v_exec else executive_id end
  where id = v_user;
  return v_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviewing (Membership Manager). Approving assigns the member number.
-- Errors: not_allowed, not_found, invalid_decision, note_required.
-- ---------------------------------------------------------------------------

create function public.review_member(p_id uuid, p_decision text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.members;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_now timestamptz := now();
begin
  if not public.has_role('membership_manager') then raise exception 'not_allowed'; end if;
  select * into v_row from public.members where id = p_id for update;
  if not found then raise exception 'not_found'; end if;

  if p_decision = 'approve' then
    update public.members set
      status = 'approved',
      approved_at = v_now,
      approved_by = public.current_email(),
      review_note = v_note,
      member_no = coalesce(member_no,
        'JKT-' || to_char(v_now at time zone 'Asia/Dhaka', 'YY') || '-' || lpad(nextval('public.member_no_seq')::text, 4, '0'))
    where id = p_id;
    return 'approved';
  elsif p_decision in ('reject', 'lapse') then
    if v_note is null then raise exception 'note_required'; end if;
    update public.members set
      status = case p_decision when 'reject' then 'rejected' else 'lapsed' end,
      review_note = left(v_note, 500)
    where id = p_id;
    return case p_decision when 'reject' then 'rejected' else 'lapsed' end;
  end if;
  raise exception 'invalid_decision';
end;
$$;

-- ---------------------------------------------------------------------------
-- The members-only directory: approved members who opted in, public fields only.
-- Error: not_allowed (only approved members, and membership managers, can see it).
-- ---------------------------------------------------------------------------

create function public.member_directory()
returns table (
  id uuid, name text, department text, intake text, photo_url text, bio text, skills text[],
  fields_of_interest text[], co_curricular text[], linkedin text, github text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.members m where m.id = auth.uid() and m.status = 'approved')
     and not public.has_role('membership_manager') then
    raise exception 'not_allowed';
  end if;
  return query
    select m.id, m.name, m.department, left(m.iub_id, 3), m.photo_url, m.bio, m.skills,
           coalesce(m.fields_of_interest, '{}'), coalesce(m.co_curricular, '{}'), m.linkedin, m.github
    from public.members m
    where m.status = 'approved' and m.show_in_directory
    order by m.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Door check-in from a member card (Event Manager). The card's signature is
-- checked by the website before this is called.
-- Error: not_allowed.
-- ---------------------------------------------------------------------------

create function public.member_for_checkin(p_member_id uuid, p_event_id uuid)
returns table (
  name text, member_no text, photo_url text, status text,
  registration_id uuid, registration_status text, checked_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('event_manager') then raise exception 'not_allowed'; end if;
  return query
    select m.name, m.member_no, m.photo_url, m.status, r.id, r.status, r.checked_in_at
    from public.members m
    left join public.event_registrations r on r.user_id = m.id and r.event_id = p_event_id
    where m.id = p_member_id;
end;
$$;

-- Same, found by the member number typed in at the door.
create function public.member_id_by_number(p_member_no text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.members m
  where public.has_role('event_manager') and m.member_no = upper(btrim(p_member_no));
$$;

-- ---------------------------------------------------------------------------
-- "My activity": the signed-in user's helpline questions and answers (user ids
-- aren't readable from the helpline tables directly).
-- ---------------------------------------------------------------------------

create function public.my_helpline_activity()
returns table (kind text, question_id uuid, title text, status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select 'question', q.id, q.title, q.status, q.created_at
  from public.helpline_questions q where q.user_id = auth.uid()
  union all
  select 'answer', q.id, q.title, a.status, a.created_at
  from public.helpline_answers a join public.helpline_questions q on q.id = a.question_id
  where a.user_id = auth.uid()
  order by 5 desc
  limit 100;
$$;

-- ---------------------------------------------------------------------------
-- Members post on the helpline under their profile name (not their Google name).
-- Anonymous questions stay anonymous: only a name that's shown is replaced.
-- ---------------------------------------------------------------------------

create function public.helpline_member_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select nullif(btrim(m.name), '') into v_name from public.members m where m.id = new.user_id;
  if v_name is null then
    return new;
  end if;
  if tg_table_name = 'helpline_questions' then
    new.asker_name := v_name;
    if new.display_name is not null then
      new.display_name := v_name;
    end if;
  else
    new.author_name := v_name;
  end if;
  return new;
end;
$$;

create trigger helpline_questions_member_name before insert on public.helpline_questions
  for each row execute function public.helpline_member_name();
create trigger helpline_answers_member_name before insert on public.helpline_answers
  for each row execute function public.helpline_member_name();

-- ---------------------------------------------------------------------------
-- Profile photos: a public bucket, at most 1 MB, each member writes only their own folder
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Reading their own files lets a member replace their photo in place (upsert).
create policy "Members see their own photo files"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members upload their own photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members replace their own photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members delete their own photo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Activity log, privileges
-- ---------------------------------------------------------------------------

create trigger members_audit after insert or update or delete on public.members
  for each row execute function public.log_admin_change();

revoke execute on function public.members_guard() from public, anon, authenticated;
revoke execute on function public.check_member_payment(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.helpline_member_name() from public, anon, authenticated;
revoke execute on function public.number_member_import() from public, anon, authenticated;
revoke execute on function public.claim_member_import() from public, anon;
grant execute on function public.claim_member_import() to authenticated;
revoke execute on function public.register_member(jsonb) from public, anon;
revoke execute on function public.update_my_profile(jsonb) from public, anon;
revoke execute on function public.review_member(uuid, text, text) from public, anon;
revoke execute on function public.member_directory() from public, anon;
revoke execute on function public.member_for_checkin(uuid, uuid) from public, anon;
revoke execute on function public.member_id_by_number(text) from public, anon;
revoke execute on function public.my_helpline_activity() from public, anon;
grant execute on function public.register_member(jsonb) to authenticated;
grant execute on function public.update_my_profile(jsonb) to authenticated;
grant execute on function public.review_member(uuid, text, text) to authenticated;
grant execute on function public.member_directory() to authenticated;
grant execute on function public.member_for_checkin(uuid, uuid) to authenticated;
grant execute on function public.member_id_by_number(text) to authenticated;
grant execute on function public.my_helpline_activity() to authenticated;
