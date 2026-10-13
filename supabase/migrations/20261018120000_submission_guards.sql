-- Anti-abuse for the two tables anyone (anon) can insert into: the contact form
-- (contact_messages) and memorial memories (sabbir_memories). The server actions already
-- have a honeypot and a per-IP limit, but the anon INSERT policies mean an attacker could
-- POST straight to PostgREST with the public key and skip all of that. These BEFORE INSERT
-- triggers run on EVERY insert — server action or direct — enforcing length caps, a
-- per-sender rate limit, and a global flood ceiling at the database, where it can't be bypassed.

-- Contact form: ≤5 per email / 10 min, and a 60/min table-wide ceiling.
create or replace function public.contact_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_global integer;
begin
  if length(coalesce(new.name, '')) not between 2 and 80
     or length(coalesce(new.email, '')) not between 3 and 200
     or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(coalesce(new.topic, '')) > 40
     or length(coalesce(new.message, '')) not between 10 and 3000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;

  select count(*) into v_recent from public.contact_messages
    where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes';
  if v_recent >= 5 then raise exception 'rate_limited' using errcode = '22023'; end if;

  select count(*) into v_global from public.contact_messages
    where created_at > now() - interval '1 minute';
  if v_global >= 60 then raise exception 'rate_limited' using errcode = '22023'; end if;

  return new;
end;
$$;

create trigger contact_messages_guard
  before insert on public.contact_messages
  for each row execute function public.contact_messages_guard();

-- Memorial memories: ≤3 per name / hour, and a 60/min table-wide ceiling.
create or replace function public.sabbir_memories_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_global integer;
begin
  if length(coalesce(new.name, '')) not between 2 and 80
     or length(coalesce(new.affiliation, '')) > 80
     or length(coalesce(new.message, '')) not between 20 and 2000
     or new.message ~* 'https?://'
     or (new.email is not null and (length(new.email) > 200 or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')) then
    raise exception 'invalid_memory' using errcode = '22023';
  end if;

  select count(*) into v_recent from public.sabbir_memories
    where lower(name) = lower(new.name) and created_at > now() - interval '1 hour';
  if v_recent >= 3 then raise exception 'rate_limited' using errcode = '22023'; end if;

  select count(*) into v_global from public.sabbir_memories
    where created_at > now() - interval '1 minute';
  if v_global >= 60 then raise exception 'rate_limited' using errcode = '22023'; end if;

  return new;
end;
$$;

create trigger sabbir_memories_guard
  before insert on public.sabbir_memories
  for each row execute function public.sabbir_memories_guard();
