-- Academic Helpline: students ask, seniors and faculty answer; plus the faculty directory.
-- Needs 20260927120000_events.sql (is_editor, touch_updated_at).

-- ---------------------------------------------------------------------------
-- Faculty directory
-- ---------------------------------------------------------------------------

create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  designation text not null default '',
  room text,
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+$'),
  -- The Google account they sign in with to answer, when it isn't `email`. Not public.
  login_email text check (login_email is null or login_email ~ '^[^@\s]+@[^@\s]+$'),
  photo_url text,
  position integer not null default 0,
  active boolean not null default true,
  -- Emailed about every new helpline question. Not public.
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger faculty_touch_updated_at
  before update on public.faculty
  for each row execute function public.touch_updated_at();

alter table public.faculty enable row level security;

create policy "Active faculty are public"
  on public.faculty for select to anon, authenticated
  using (active or (select public.is_editor()));

create policy "Editors manage faculty"
  on public.faculty for all to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Seniors: students the club trusts to answer (added by editors, by email)
-- ---------------------------------------------------------------------------

create table public.helpline_seniors (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$'),
  name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.helpline_seniors enable row level security;

create policy "Editors manage seniors"
  on public.helpline_seniors for all to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Questions and answers
-- ---------------------------------------------------------------------------

create table public.helpline_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asker_name text not null,
  asker_email text not null,
  anonymous boolean not null default false,
  -- What the board shows as the asker: null when they asked anonymously.
  display_name text,
  topic text not null check (topic in ('course', 'programming', 'math', 'projects', 'career', 'other')),
  course text check (course is null or char_length(course) between 1 and 40),
  title text not null check (char_length(title) between 5 and 150),
  body text not null check (char_length(body) between 20 and 5000),
  -- Editors hide abusive or off-topic posts.
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index helpline_questions_board_idx on public.helpline_questions (created_at desc) where status = 'visible';
create index helpline_questions_user_idx on public.helpline_questions (user_id, created_at);

create trigger helpline_questions_touch_updated_at
  before update on public.helpline_questions
  for each row execute function public.touch_updated_at();

create table public.helpline_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.helpline_questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_role text not null check (author_role in ('faculty', 'senior', 'editor')),
  body text not null check (char_length(body) between 2 and 5000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create index helpline_answers_question_idx on public.helpline_answers (question_id, created_at);

alter table public.helpline_questions enable row level security;
alter table public.helpline_answers enable row level security;

-- Posting goes through ask_helpline_question() / answer_helpline_question(); there are
-- no insert policies. Editors may hide (update status) and see what's hidden.
create policy "Visible questions are public"
  on public.helpline_questions for select to anon, authenticated
  using (status = 'visible' or (select public.is_editor()));

create policy "Editors moderate questions"
  on public.helpline_questions for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

create policy "Visible answers are public"
  on public.helpline_answers for select to anon, authenticated
  using (
    (status = 'visible' and exists (
      select 1 from public.helpline_questions q where q.id = question_id and q.status = 'visible'
    ))
    or (select public.is_editor())
  );

create policy "Editors moderate answers"
  on public.helpline_answers for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Privileges: only public columns are readable (no asker emails, no user ids)
-- ---------------------------------------------------------------------------

revoke all on public.faculty, public.helpline_seniors, public.helpline_questions, public.helpline_answers
  from anon, authenticated;

grant select (id, name, designation, room, email, photo_url, position, active) on public.faculty to anon, authenticated;
grant insert, update, delete on public.faculty to authenticated;
grant select, insert, update, delete on public.helpline_seniors to authenticated;

grant select (id, anonymous, display_name, topic, course, title, body, status, created_at, updated_at)
  on public.helpline_questions to anon, authenticated;
grant update (status) on public.helpline_questions to authenticated;

grant select (id, question_id, author_name, author_role, body, status, created_at)
  on public.helpline_answers to anon, authenticated;
grant update (status) on public.helpline_answers to authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- The signed-in user's verified email, lower-cased, or null.
create function public.helpline_viewer_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;

-- Who may answer: 'faculty' (an active directory entry's email or login email),
-- 'senior' (listed in helpline_seniors), 'editor', or null for everyone else.
create function public.helpline_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.helpline_viewer_email() as email)
  select case
    when (select email from me) is null then null
    when exists (
      select 1 from public.faculty f, me
      where f.active and (lower(f.email) = me.email or lower(f.login_email) = me.email)
    ) then 'faculty'
    when exists (select 1 from public.helpline_seniors s, me where s.email = me.email) then 'senior'
    when public.is_editor() then 'editor'
  end;
$$;

-- Post a question as the signed-in user. At most 5 a day each, since every question
-- emails the faculty. Errors (as the message): not_authenticated, invalid_topic,
-- invalid_course, invalid_title, invalid_body, rate_limited.
create function public.ask_helpline_question(
  p_topic text,
  p_course text,
  p_title text,
  p_body text,
  p_anonymous boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text;
  v_recent integer;
  v_id uuid;
begin
  select u.email,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1))
  into v_email, v_name
  from auth.users u
  where u.id = v_user and u.email_confirmed_at is not null;
  if v_user is null or v_email is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  p_title := btrim(coalesce(p_title, ''));
  p_body := btrim(coalesce(p_body, ''));
  p_course := nullif(btrim(coalesce(p_course, '')), '');
  if p_topic is null or p_topic not in ('course', 'programming', 'math', 'projects', 'career', 'other') then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;
  if p_course is not null and char_length(p_course) > 40 then
    raise exception 'invalid_course' using errcode = '22023';
  end if;
  if char_length(p_title) not between 5 and 150 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if char_length(p_body) not between 20 and 5000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select count(*) into v_recent
  from public.helpline_questions q
  where q.user_id = v_user and q.created_at > now() - interval '1 day';
  if v_recent >= 5 then
    raise exception 'rate_limited' using errcode = '22023';
  end if;

  insert into public.helpline_questions
    (user_id, asker_name, asker_email, anonymous, display_name, topic, course, title, body)
  values
    (v_user, v_name, v_email, coalesce(p_anonymous, false),
     case when coalesce(p_anonymous, false) then null else v_name end,
     p_topic, p_course, p_title, p_body)
  returning id into v_id;

  return v_id;
end;
$$;

-- Answer a question as a senior, faculty member or editor. Returns what the page needs
-- to email the asker: { answer_id, author_name, author_role, asker_email, asker_name,
-- question_title, own_question }.
-- Errors: not_authenticated, not_an_answerer, invalid_body, question_not_found.
create function public.answer_helpline_question(p_question_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := public.helpline_viewer_email();
  v_role text := public.helpline_role();
  v_name text;
  v_question public.helpline_questions%rowtype;
  v_answer uuid;
begin
  if v_user is null or v_email is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_role is null then
    raise exception 'not_an_answerer' using errcode = '42501';
  end if;

  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_body) not between 2 and 5000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select * into v_question
  from public.helpline_questions q
  where q.id = p_question_id and q.status = 'visible';
  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;

  -- Their name as the club knows it: the directory for faculty, the seniors list, else Google.
  if v_role = 'faculty' then
    select f.name into v_name from public.faculty f
    where f.active and (lower(f.email) = v_email or lower(f.login_email) = v_email)
    order by f.position limit 1;
  elsif v_role = 'senior' then
    select nullif(s.name, '') into v_name from public.helpline_seniors s where s.email = v_email;
  end if;
  if v_name is null then
    select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1))
    into v_name from auth.users u where u.id = v_user;
  end if;

  insert into public.helpline_answers (question_id, user_id, author_name, author_role, body)
  values (p_question_id, v_user, v_name, v_role, p_body)
  returning id into v_answer;

  return jsonb_build_object(
    'answer_id', v_answer,
    'author_name', v_name,
    'author_role', v_role,
    'asker_email', v_question.asker_email,
    'asker_name', v_question.asker_name,
    'question_title', v_question.title,
    'own_question', v_question.user_id = v_user
  );
end;
$$;

-- The faculty emailed about every new question.
create function public.helpline_faculty_recipients()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select f.email from public.faculty f where f.active and f.notify order by f.position;
$$;

revoke execute on function public.helpline_viewer_email() from public, anon;
revoke execute on function public.helpline_role() from public, anon;
revoke execute on function public.ask_helpline_question(text, text, text, text, boolean) from public, anon;
revoke execute on function public.answer_helpline_question(uuid, text) from public, anon;
revoke execute on function public.helpline_faculty_recipients() from public, anon;
grant execute on function public.helpline_viewer_email() to authenticated;
grant execute on function public.helpline_role() to authenticated;
grant execute on function public.ask_helpline_question(text, text, text, text, boolean) to authenticated;
grant execute on function public.answer_helpline_question(uuid, text) to authenticated;
grant execute on function public.helpline_faculty_recipients() to authenticated;
