# Supabase

The site shares a Supabase project with the registration app (same `auth.users`).
Migrations here only add objects; they never change the registration app's tables.
Try every migration on a separate dev project first.

Day-to-day, everything is managed in the **admin panel at `/admin`**. This guide covers
the one-time setup, and how the panel's roles work.

## Connecting the site

1. **Apply the migrations, oldest first.** With the Supabase CLI linked to the project,
   run `supabase db push`, or paste each file in `migrations/` into the SQL editor:
   - `…_events.sql`: events, RSVPs, event photos, the public `media` storage bucket
   - `…_logs.sql`: Jukti Logs
   - `…_helpline.sql`: the Academic Helpline and the faculty directory
   - `…_memories.sql`: memories shared on Dr. Sabbir's memorial page
   - `…_admin.sql`: admin roles, the activity log, the contact inbox, and tables for
     the team, alumni, About story, developers and site settings
2. **Load the starting content**: paste `seed/faculty.sql`, then `seed/content.sql`, into
   the SQL editor. (`content.sql` copies the team, alumni, story chapters, developers,
   board term and social links from `src/lib/data/`. It only fills empty tables, so it's
   safe to run again. Regenerate it with `node scripts/content-seed.mjs`.)
3. **Turn on Google sign-in.** Authentication > Sign In / Providers > Google, with the
   Client ID and secret of an OAuth client from Google Cloud Console (APIs & Services >
   Credentials). In that OAuth client, under **Authorized redirect URIs**, add
   `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact
   "Callback URL" on its Google provider page). Without it, Google answers
   "Error 400: redirect_uri_mismatch".
4. **Allow the redirect back to the site.** Authentication > URL Configuration > Redirect
   URLs: add `http://localhost:3000/**`, `http://localhost:3200/**` (the preview server) and
   `https://<your-domain>/**`.
5. **Set the environment variables** from `.env.example` in `.env.local` and on Vercel.
6. **Make the first Master Admin**, once, in the SQL editor (use their Google email):
   ```sql
   insert into public.user_roles (email, role, granted_by)
   values ('someone@gmail.com', 'master_admin', 'setup');
   ```
   They sign in at `/admin` and give everyone else access from **People & roles**.

Without Supabase, the site runs on the sample content in `src/lib/data/`, and in
development `/admin` opens in preview mode: sample data, a role switcher, nothing saved.

## Roles

Roles are given by Google email in **People & roles** and apply the next time the person
signs in. Someone can hold several. The database enforces every role with row-level
security, so the panel's menus only decide what's shown.

| Role | Manages |
| --- | --- |
| **Master Admin** | Everything below, plus People & roles, Settings (social links), the Developers page, the memorial page's text and photos, and the Activity log |
| **Event Manager** | Events: create, edit, publish; RSVPs: the list, check-in at the door, cancelling a seat (the waitlist moves up), CSV download |
| **PR Editor** | Jukti Logs; recaps and photo galleries of past events; the About story; approving memories of Dr. Sabbir; the contact Inbox |
| **Academic Coordinator** | Helpline moderation (hide or restore questions and answers), the faculty directory, helpline seniors; answers questions with a JUKTI badge |
| **Team Manager** | The executive panel and faculty advisors, the board term, and alumni |

There must always be at least one Master Admin; the last one can't be removed.

## Good to know

- **Nothing is deleted from the panel** except event photos, log drafts, RSVPs (cancelled)
  and roles. Everything else is hidden or unpublished, so it can be brought back.
- **The Activity log** records every change made by an admin: who, what and when.
- **Contact messages** are saved in the Inbox and also emailed to the club.
- **Memories** of Dr. Sabbir appear on his page only once a PR Editor approves them.
  The email someone leaves with a memory is only visible to PR Editors.
- **Helpline askers' emails** are only visible to Academic Coordinators, in the panel.
- **Changes show on the site immediately** when made in the panel. Edits made directly in
  the Supabase table editor can take up to an hour to appear (the pages are cached).
- **Images** uploaded in the panel open in a cropper first, framed to the card they'll
  appear in (team portrait, event cover, story photo…): drag to position, zoom to size,
  and they're saved at the size that card needs. Event gallery photos keep their own
  shape and are only resized (to at most 2000px). Everything goes to the `media` bucket,
  and photos need a description for screen readers.
