-- The admin panel: roles, per-role permissions, content that used to live in code,
-- the contact inbox and an activity log.
-- Needs every earlier migration (events, logs, helpline, memories).

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

-- Granted by email, so a role can be given before the person first signs in.
-- master_admin can do everything; the others manage one area each. A person may
-- hold several roles.
create table public.user_roles (
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$'),
  role text not null check (role in ('master_admin', 'event_manager', 'pr_editor', 'academic_coordinator', 'team_manager')),
  granted_by text,
  created_at timestamptz not null default now(),
  primary key (email, role)
);

alter table public.user_roles enable row level security;

-- Carry over anyone who was an editor or admin before.
insert into public.user_roles (email, role, granted_by)
select lower(u.email), case r.role when 'admin' then 'master_admin' else 'pr_editor' end, 'migration'
from public.site_roles r
join auth.users u on u.id = r.user_id
where u.email is not null
on conflict do nothing;

-- The signed-in user's verified email, lower-cased (null when signed out).
create function public.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;

-- True if the signed-in user holds `p_role`, or is a master admin.
create function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.email = public.current_email() and r.role in (p_role, 'master_admin')
  );
$$;

create function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('master_admin');
$$;

-- The signed-in user's roles.
create function public.my_roles()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select r.role from public.user_roles r where r.email = public.current_email() order by r.role;
$$;

-- "Has any admin role": unpublished content is visible to every admin. (It used to read
-- site_roles; every policy that calls it keeps working.)
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles r where r.email = public.current_email());
$$;

create policy "Admins read their own roles; masters read all"
  on public.user_roles for select to authenticated
  using (email = (select public.current_email()) or (select public.is_master()));

create policy "Masters grant roles"
  on public.user_roles for insert to authenticated
  with check ((select public.is_master()));

create policy "Masters revoke roles"
  on public.user_roles for delete to authenticated
  using ((select public.is_master()));

-- There must always be a master admin.
create function public.keep_a_master_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'master_admin'
     and not exists (select 1 from public.user_roles r where r.role = 'master_admin' and r.email <> old.email) then
    raise exception 'last_master_admin' using errcode = '22023';
  end if;
  return old;
end;
$$;

create trigger user_roles_keep_a_master
  before delete on public.user_roles
  for each row execute function public.keep_a_master_admin();

grant select, insert, delete on public.user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- Existing areas, now limited to their role
-- ---------------------------------------------------------------------------

-- Events: the Event Manager. (PR Editors write recaps through set_event_recap.)
drop policy "Editors manage events" on public.events;
create policy "Event managers manage events"
  on public.events for all to authenticated
  using ((select public.has_role('event_manager')))
  with check ((select public.has_role('event_manager')));

drop policy "Users read their own RSVPs, editors read all" on public.event_registrations;
create policy "Users read their own RSVPs, event managers read all"
  on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('event_manager')));

drop policy "Editors update RSVPs" on public.event_registrations;
create policy "Event managers update RSVPs"
  on public.event_registrations for update to authenticated
  using ((select public.has_role('event_manager')))
  with check ((select public.has_role('event_manager')));

-- Gallery photos: the PR Editor documents past events.
drop policy "Editors manage photos" on public.event_photos;
create policy "PR editors manage photos"
  on public.event_photos for all to authenticated
  using ((select public.has_role('pr_editor')))
  with check ((select public.has_role('pr_editor')));

-- Logs: the PR Editor.
drop policy "Editors manage logs" on public.logs;
create policy "PR editors manage logs"
  on public.logs for all to authenticated
  using ((select public.has_role('pr_editor')))
  with check ((select public.has_role('pr_editor')));

-- Helpline and the faculty directory: the Academic Coordinator.
drop policy "Editors manage faculty" on public.faculty;
create policy "Academic coordinators manage faculty"
  on public.faculty for all to authenticated
  using ((select public.has_role('academic_coordinator')))
  with check ((select public.has_role('academic_coordinator')));

drop policy "Editors manage seniors" on public.helpline_seniors;
create policy "Academic coordinators manage seniors"
  on public.helpline_seniors for all to authenticated
  using ((select public.has_role('academic_coordinator')))
  with check ((select public.has_role('academic_coordinator')));

drop policy "Editors moderate questions" on public.helpline_questions;
create policy "Academic coordinators moderate questions"
  on public.helpline_questions for update to authenticated
  using ((select public.has_role('academic_coordinator')))
  with check ((select public.has_role('academic_coordinator')));

drop policy "Editors moderate answers" on public.helpline_answers;
create policy "Academic coordinators moderate answers"
  on public.helpline_answers for update to authenticated
  using ((select public.has_role('academic_coordinator')))
  with check ((select public.has_role('academic_coordinator')));

-- Who may answer: faculty, seniors, and (with the JUKTI badge) the Academic Coordinator.
create or replace function public.helpline_role()
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
    when public.has_role('academic_coordinator') then 'editor'
  end;
$$;

-- Memories of Dr. Sabbir: the PR Editor approves them.
drop policy "Editors review memories" on public.sabbir_memories;
create policy "PR editors review memories"
  on public.sabbir_memories for update to authenticated
  using ((select public.has_role('pr_editor')))
  with check ((select public.has_role('pr_editor')));

-- Storage: anyone who manages content with pictures.
drop policy "Editors upload media" on storage.objects;
drop policy "Editors update media" on storage.objects;
drop policy "Editors delete media" on storage.objects;

create function public.can_manage_media()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('pr_editor') or public.has_role('event_manager') or public.has_role('team_manager');
$$;

create policy "Content admins upload media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.can_manage_media()));
create policy "Content admins update media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.can_manage_media()));
create policy "Content admins delete media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.can_manage_media()));

-- ---------------------------------------------------------------------------
-- Admin functions for existing areas
-- ---------------------------------------------------------------------------

-- The PR Editor writes an event's recap without being able to change the event itself.
create function public.set_event_recap(p_event_id uuid, p_recap text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('pr_editor') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.events set recap = nullif(btrim(coalesce(p_recap, '')), '') where id = p_event_id;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Cancel someone's RSVP from the panel; before the event, the waitlist moves up.
create function public.admin_cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations%rowtype;
  v_event public.events%rowtype;
  v_next uuid;
begin
  if not public.has_role('event_manager') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_reg from public.event_registrations where id = p_registration_id;
  if not found then
    raise exception 'registration_not_found' using errcode = 'P0002';
  end if;
  select * into v_event from public.events where id = v_reg.event_id for update;

  update public.event_registrations set status = 'cancelled' where id = p_registration_id;

  if v_reg.status = 'registered' and now() < v_event.starts_at then
    select r.id into v_next from public.event_registrations r
    where r.event_id = v_reg.event_id and r.status = 'waitlisted'
    order by r.queued_at, r.id limit 1;
    if found then
      update public.event_registrations set status = 'registered' where id = v_next;
    end if;
  end if;
end;
$$;

-- Memories with the sharer's email, for the PR Editor (emails aren't readable otherwise).
create function public.admin_memories()
returns setof public.sabbir_memories
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('pr_editor') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query select * from public.sabbir_memories order by created_at desc;
end;
$$;

-- Helpline posts awaiting attention, with who asked (for the Academic Coordinator).
create function public.admin_helpline_questions()
returns table (id uuid, title text, body text, topic text, course text, asker_name text, asker_email text,
               anonymous boolean, status text, created_at timestamptz, answers integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('academic_coordinator') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select q.id, q.title, q.body, q.topic, q.course, q.asker_name, q.asker_email, q.anonymous, q.status, q.created_at,
           (select count(*)::int from public.helpline_answers a where a.question_id = q.id)
    from public.helpline_questions q
    order by q.created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content that used to live in code
-- ---------------------------------------------------------------------------

-- Team page: faculty advisors and the executive panel. Team Manager.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('advisor', 'executive')),
  name text not null check (char_length(name) between 1 and 80),
  role text not null default '',
  photo_url text,
  linkedin text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alumni (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'Executive',
  term text not null default '',
  photo_url text,
  linkedin text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- About page story map. PR Editor.
create table public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kicker text not null default '',
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '',
  badge text not null default '',
  photo_hint text not null default '',
  photo_url text,
  photo_alt text not null default '',
  link_href text,
  link_label text,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Developers page. Master admin.
create table public.developers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  role text not null default '',
  designation text not null default '',
  photo_url text,
  -- { "linkedin": "...", "github": "...", "facebook": "...", "instagram": "...", "website": "...", "email": "..." }
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Site-wide settings (socials, contact email, board term, the memorial page's text...). Master admin.
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger team_members_touch_updated_at before update on public.team_members for each row execute function public.touch_updated_at();
create trigger alumni_touch_updated_at before update on public.alumni for each row execute function public.touch_updated_at();
create trigger story_chapters_touch_updated_at before update on public.story_chapters for each row execute function public.touch_updated_at();
create trigger developers_touch_updated_at before update on public.developers for each row execute function public.touch_updated_at();
create trigger site_settings_touch_updated_at before update on public.site_settings for each row execute function public.touch_updated_at();

alter table public.team_members enable row level security;
alter table public.alumni enable row level security;
alter table public.story_chapters enable row level security;
alter table public.developers enable row level security;
alter table public.site_settings enable row level security;

create policy "Active team is public" on public.team_members for select to anon, authenticated
  using (active or (select public.has_role('team_manager')));
create policy "Team managers manage the team" on public.team_members for all to authenticated
  using ((select public.has_role('team_manager'))) with check ((select public.has_role('team_manager')));

create policy "Active alumni are public" on public.alumni for select to anon, authenticated
  using (active or (select public.has_role('team_manager')));
create policy "Team managers manage alumni" on public.alumni for all to authenticated
  using ((select public.has_role('team_manager'))) with check ((select public.has_role('team_manager')));

create policy "Published chapters are public" on public.story_chapters for select to anon, authenticated
  using (published or (select public.has_role('pr_editor')));
create policy "PR editors manage the story" on public.story_chapters for all to authenticated
  using ((select public.has_role('pr_editor'))) with check ((select public.has_role('pr_editor')));

create policy "Active developers are public" on public.developers for select to anon, authenticated
  using (active or (select public.is_master()));
create policy "Masters manage developers" on public.developers for all to authenticated
  using ((select public.is_master())) with check ((select public.is_master()));

create policy "Settings are public" on public.site_settings for select to anon, authenticated using (true);
-- The board term is the Team Manager's; everything else is the master admin's.
create policy "Masters and team managers manage settings" on public.site_settings for all to authenticated
  using ((select public.is_master()) or (key = 'team.board_term' and (select public.has_role('team_manager'))))
  with check ((select public.is_master()) or (key = 'team.board_term' and (select public.has_role('team_manager'))));

grant select on public.team_members, public.alumni, public.story_chapters, public.developers, public.site_settings to anon, authenticated;
grant insert, update, delete on public.team_members, public.alumni, public.story_chapters, public.developers, public.site_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Contact inbox
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+$'),
  topic text not null default 'general',
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_messages_created_idx on public.contact_messages (created_at desc);
create trigger contact_messages_touch_updated_at before update on public.contact_messages for each row execute function public.touch_updated_at();

alter table public.contact_messages enable row level security;

create policy "Anyone can send a message" on public.contact_messages for insert to anon, authenticated
  with check (status = 'new');
-- No row is readable by anyone else, so the whole table can be granted.
create policy "PR editors read messages" on public.contact_messages for select to authenticated
  using ((select public.has_role('pr_editor')));
create policy "PR editors update messages" on public.contact_messages for update to authenticated
  using ((select public.has_role('pr_editor'))) with check ((select public.has_role('pr_editor')));

grant insert (name, email, topic, message) on public.contact_messages to anon, authenticated;
grant select, update (status) on public.contact_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Activity log: every change an admin makes
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  -- A short label for the row (its title or name), for reading the log.
  label text
);

create index audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;
create policy "Masters read the activity log" on public.audit_log for select to authenticated
  using ((select public.is_master()));
grant select on public.audit_log to authenticated;

-- Records changes made by admins (visitors' own sign-ups and posts aren't logged).
create function public.log_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  if not public.is_editor() then
    return null;
  end if;
  insert into public.audit_log (actor, table_name, row_id, action, label)
  values (
    public.current_email(),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'email'),
    lower(tg_op),
    left(coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'full_name', v_row ->> 'key',
                  case when tg_table_name = 'user_roles' then (v_row ->> 'email') || ' · ' || (v_row ->> 'role') end), 160)
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'events', 'event_photos', 'event_registrations', 'logs', 'faculty', 'helpline_seniors',
    'helpline_questions', 'helpline_answers', 'sabbir_memories', 'team_members', 'alumni',
    'story_chapters', 'developers', 'site_settings', 'user_roles', 'contact_messages'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_admin_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.keep_a_master_admin() from public, anon, authenticated;
revoke execute on function public.log_admin_change() from public, anon, authenticated;
revoke execute on function public.set_event_recap(uuid, text) from public, anon;
revoke execute on function public.admin_cancel_registration(uuid) from public, anon;
revoke execute on function public.admin_memories() from public, anon;
revoke execute on function public.admin_helpline_questions() from public, anon;
revoke execute on function public.my_roles() from public, anon;
grant execute on function public.current_email() to anon, authenticated;
grant execute on function public.has_role(text) to anon, authenticated;
grant execute on function public.is_master() to anon, authenticated;
grant execute on function public.can_manage_media() to anon, authenticated;
grant execute on function public.my_roles() to authenticated;
grant execute on function public.set_event_recap(uuid, text) to authenticated;
grant execute on function public.admin_cancel_registration(uuid) to authenticated;
grant execute on function public.admin_memories() to authenticated;
grant execute on function public.admin_helpline_questions() to authenticated;
