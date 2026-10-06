-- Former faculty advisors on Team Jukti: kept with the alumni (same fields: name, role,
-- term, photo, LinkedIn), marked by `kind`. Managed by Team Managers on the Alumni page.
-- Needs 20261004120000_admin.sql.

alter table public.alumni
  add column if not exists kind text not null default 'alumnus' check (kind in ('alumnus', 'former_advisor'));

create index if not exists alumni_kind_idx on public.alumni (kind, position);
