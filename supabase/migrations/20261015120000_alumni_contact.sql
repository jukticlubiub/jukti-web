-- Contact details for alumni and former faculty advisors on Team Jukti: an email address and
-- links to their profiles (LinkedIn, a website, Behance, GitHub...). Public, like the rest of
-- the row. Managed by Team Managers on Admin > Alumni & advisors.
-- The old single `linkedin` column is folded into `links` (the panel saves everything there now).
-- Needs 20261013120000_former_advisors.sql.

alter table public.alumni
  add column if not exists email text
    check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column if not exists links text[] not null default '{}'
    check (cardinality(links) <= 8);

update public.alumni set links = array[linkedin] where linkedin is not null and links = '{}';
