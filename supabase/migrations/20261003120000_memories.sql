-- Memories of Dr. Ali Shihab Sabbir, shared on his memorial page (/about/dr-ali-shihab-sabbir).
-- Anyone may submit one; it appears only after an editor approves it.
-- Needs 20260927120000_events.sql (is_editor).

create table public.sabbir_memories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  relation text not null check (relation in ('student', 'colleague', 'friend', 'family', 'other')),
  -- e.g. "CSE, 2012" or "Department of EEE". Optional.
  affiliation text check (affiliation is null or char_length(affiliation) <= 80),
  message text not null check (char_length(message) between 20 and 2000),
  -- So the club can follow up (e.g. to ask for photos). Never public.
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index sabbir_memories_approved_idx on public.sabbir_memories (approved_at desc) where status = 'approved';

alter table public.sabbir_memories enable row level security;

create policy "Approved memories are public"
  on public.sabbir_memories for select to anon, authenticated
  using (status = 'approved' or (select public.is_editor()));

-- Submissions always start pending.
create policy "Anyone can share a memory"
  on public.sabbir_memories for insert to anon, authenticated
  with check (status = 'pending' and approved_at is null);

create policy "Editors review memories"
  on public.sabbir_memories for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

-- Only the public columns are readable; emails can be written but never read through the API.
revoke all on public.sabbir_memories from anon, authenticated;
grant select (id, name, relation, affiliation, message, status, created_at, approved_at) on public.sabbir_memories to anon, authenticated;
grant insert (name, relation, affiliation, message, email) on public.sabbir_memories to anon, authenticated;
grant update (status, approved_at) on public.sabbir_memories to authenticated;
