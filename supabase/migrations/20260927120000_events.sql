-- Events, RSVPs and event photos for the JUKTI website.
--
-- The site shares its Supabase project (and auth.users) with the registration app,
-- so this migration only adds objects. It never alters the registration app's tables.
-- Apply it to the dev project first:  supabase db push

-- ---------------------------------------------------------------------------
-- Site editors
-- ---------------------------------------------------------------------------

-- Who may edit site content. Anyone without a row is a regular visitor.
create table public.site_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.site_roles enable row level security;

create policy "Users can read their own site role"
  on public.site_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- Security definer so policies can call it without tripping site_roles' own RLS.
create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.site_roles where user_id = (select auth.uid()));
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

-- Whether an event is upcoming, happening now or past is worked out from its dates.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  summary text not null default '',
  -- Plain text; a blank line starts a new paragraph.
  description text not null default '',
  category text not null default 'workshop'
    check (category in ('workshop', 'contest', 'hackathon', 'seminar', 'social', 'orientation')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null default '',
  cover_url text,
  cover_alt text not null default '',
  -- [{ "time": "10:00", "title": "Check-in", "detail": "..." }]
  agenda jsonb not null default '[]'::jsonb check (jsonb_typeof(agenda) = 'array'),
  -- A short write-up shown once the event is over.
  recap text,
  rsvp_enabled boolean not null default false,
  -- When RSVPs close. Null means when the event starts.
  rsvp_deadline timestamptz,
  -- Seats. Null means no limit. Sign-ups past capacity join the waitlist.
  capacity integer check (capacity is null or capacity > 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index events_published_starts_at_idx on public.events (starts_at desc) where published;

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

create policy "Published events are public"
  on public.events for select to anon, authenticated
  using (published or (select public.is_editor()));

create policy "Editors manage events"
  on public.events for all to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  student_id text not null,
  status text not null check (status in ('registered', 'waitlisted', 'cancelled')),
  -- Place in line for the waitlist. Reset when someone signs up again after cancelling.
  queued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_registrations_queue_idx on public.event_registrations (event_id, status, queued_at);
create index event_registrations_user_idx on public.event_registrations (user_id);

create trigger event_registrations_touch_updated_at
  before update on public.event_registrations
  for each row execute function public.touch_updated_at();

alter table public.event_registrations enable row level security;

-- There are no insert or delete policies: sign-ups and cancellations go through
-- register_for_event() and cancel_event_registration(), which enforce the rules.
create policy "Users read their own RSVPs, editors read all"
  on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_editor()));

create policy "Editors update RSVPs"
  on public.event_registrations for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Event photos (the gallery of a past event)
-- ---------------------------------------------------------------------------

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  url text not null,
  alt text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_photos_event_idx on public.event_photos (event_id, position);

alter table public.event_photos enable row level security;

create policy "Photos of published events are public"
  on public.event_photos for select to anon, authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.published)
    or (select public.is_editor())
  );

create policy "Editors manage photos"
  on public.event_photos for all to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- RSVP functions
-- ---------------------------------------------------------------------------

-- Seats taken and waitlist length per published event, without exposing who signed up.
create function public.event_rsvp_counts(p_event_ids uuid[] default null)
returns table (event_id uuid, registered integer, waitlisted integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id,
         (count(r.id) filter (where r.status = 'registered'))::integer,
         (count(r.id) filter (where r.status = 'waitlisted'))::integer
  from public.events e
  left join public.event_registrations r on r.event_id = e.id
  where e.published and (p_event_ids is null or e.id = any (p_event_ids))
  group by e.id;
$$;

-- The signed-in user's RSVP for an event: { status, position } or null.
-- position is their place on the waitlist (1 = next in line), otherwise null.
create function public.my_event_registration(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', r.status,
    'position', case when r.status = 'waitlisted' then (
      select count(*)::integer
      from public.event_registrations w
      where w.event_id = r.event_id
        and w.status = 'waitlisted'
        and (w.queued_at, w.id) <= (r.queued_at, r.id)
    ) end
  )
  from public.event_registrations r
  where r.event_id = p_event_id
    and r.user_id = (select auth.uid())
    and r.status <> 'cancelled';
$$;

-- Sign the current user up for an event. Takes a seat if one is free, otherwise joins
-- the waitlist. Signing up again keeps an existing place and updates the details.
-- Errors (raised as the message): not_authenticated, invalid_name, invalid_student_id,
-- event_not_found, rsvp_not_enabled, rsvp_closed.
create function public.register_for_event(p_event_id uuid, p_full_name text, p_student_id text)
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
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  p_full_name := btrim(coalesce(p_full_name, ''));
  p_student_id := btrim(coalesce(p_student_id, ''));
  if char_length(p_full_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  -- IUB student IDs are 7 digits.
  if p_student_id !~ '^[0-9]{7}$' then
    raise exception 'invalid_student_id' using errcode = '22023';
  end if;

  -- Lock the event row so sign-ups for the last seat are handled one at a time.
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

  select r.status into v_current
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = v_user;

  if v_current in ('registered', 'waitlisted') then
    update public.event_registrations r
    set full_name = p_full_name, student_id = p_student_id, email = v_email
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
      (event_id, user_id, full_name, email, student_id, status, queued_at)
    values (p_event_id, v_user, p_full_name, v_email, p_student_id, v_status, now())
    on conflict (event_id, user_id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          student_id = excluded.student_id,
          status = excluded.status,
          queued_at = excluded.queued_at,
          checked_in_at = null;
  end if;

  return public.my_event_registration(p_event_id);
end;
$$;

-- Cancel the current user's RSVP. When a seat frees up before the event starts, the
-- first person on the waitlist gets it. Errors: not_authenticated, event_not_found, event_over.
create function public.cancel_event_registration(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event public.events%rowtype;
  v_previous text;
  v_next uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_event from public.events where id = p_event_id and published for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  -- Keep the attendance record once the event is over.
  if now() >= v_event.ends_at then
    raise exception 'event_over' using errcode = '22023';
  end if;

  select r.status into v_previous
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = v_user;

  if v_previous in ('registered', 'waitlisted') then
    update public.event_registrations r
    set status = 'cancelled'
    where r.event_id = p_event_id and r.user_id = v_user;
  end if;

  if v_previous = 'registered' and now() < v_event.starts_at then
    select r.id into v_next
    from public.event_registrations r
    where r.event_id = p_event_id and r.status = 'waitlisted'
    order by r.queued_at, r.id
    limit 1;

    if found then
      update public.event_registrations r set status = 'registered' where r.id = v_next;
    end if;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant select on public.events, public.event_photos to anon, authenticated;
grant insert, update, delete on public.events, public.event_photos to authenticated;
grant select, update on public.event_registrations to authenticated;
grant select on public.site_roles to authenticated;

-- Supabase grants new functions to anon and authenticated by default, so revoke explicitly.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.my_event_registration(uuid) from public, anon;
revoke execute on function public.register_for_event(uuid, text, text) from public, anon;
revoke execute on function public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.is_editor() to anon, authenticated;
grant execute on function public.event_rsvp_counts(uuid[]) to anon, authenticated;
grant execute on function public.my_event_registration(uuid) to authenticated;
grant execute on function public.register_for_event(uuid, text, text) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: covers and gallery photos. Public to read, editors upload.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Editors upload media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_editor()));

create policy "Editors update media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));

create policy "Editors delete media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));
