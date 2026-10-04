-- Jukti Logs: the club's blog. Only editors write; everyone reads what's published.
-- Needs 20260927120000_events.sql (is_editor, touch_updated_at).

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  -- One or two sentences for cards, the feed and link previews.
  excerpt text not null default '',
  -- Markdown (GitHub flavored). Raw HTML is not rendered.
  body text not null default '',
  category text not null default 'news'
    check (category in ('tutorial', 'news', 'recap', 'career', 'research', 'story')),
  cover_url text,
  cover_alt text not null default '',
  author_name text not null default 'JUKTI',
  author_role text,
  author_avatar_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- When it went (or goes) live. A future date schedules the post.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index logs_published_idx on public.logs (published_at desc) where status = 'published';

create trigger logs_touch_updated_at
  before update on public.logs
  for each row execute function public.touch_updated_at();

-- Publishing without a date means "now".
create function public.logs_default_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger logs_default_published_at
  before insert or update on public.logs
  for each row execute function public.logs_default_published_at();

alter table public.logs enable row level security;

create policy "Published logs are public"
  on public.logs for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or (select public.is_editor()));

create policy "Editors manage logs"
  on public.logs for all to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

grant select on public.logs to anon, authenticated;
grant insert, update, delete on public.logs to authenticated;
revoke execute on function public.logs_default_published_at() from public, anon, authenticated;
