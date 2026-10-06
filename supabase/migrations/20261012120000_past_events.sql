-- PR Editors document past events, including ones that were never on the site: they
-- can add an event that's already over, and fix the details of past events. Never one
-- that's still to come, and never with RSVPs (Event Managers handle those).
-- Needs 20261004120000_admin.sql.

create policy "PR editors add past events"
  on public.events for insert to authenticated
  with check ((select public.has_role('pr_editor')) and ends_at < now() and not rsvp_enabled);

create policy "PR editors edit past events"
  on public.events for update to authenticated
  using ((select public.has_role('pr_editor')) and ends_at < now())
  with check ((select public.has_role('pr_editor')) and ends_at < now() and not rsvp_enabled);
