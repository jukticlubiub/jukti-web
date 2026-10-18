# Supabase

The site has its own Supabase project. (The old registration app, Jukti Reg, uses a
different one; its members are brought over with a one-time import, see **Members**.)
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
   - `…_members.sql`: member accounts (`members`, the same columns as the registration
     app's table), the import table for the registration app's members, profile photos
   - `…_public_members.sql`: the public members list on the Team Jukti page
   - `…_member_moderation.sql`: executive codes and moderating members in the panel
   - `…_event_stations.sql`: scan stations at events (Lunch, Snacks…)
   - `…_event_tickets.sql`: a ticket (code + QR) for every RSVP, and paid events
   - `…_rsvp_guests.sql`: guests from outside IUB can RSVP (student ID optional)
   - `…_past_events.sql`: PR Editors can add and document events that are already over
   - `…_former_advisors.sql`: former faculty advisors, kept with the alumni
   - `…_registration_toggle.sql`: opening and closing member registration
   - `…_alumni_contact.sql`: email and profile links for alumni and former advisors
   - `…_member_verification.sql`: switching the executive code at registration on and off,
     and a required photo when registering or saving a profile
   - `…_imported_no_code.sql`: members imported from the registration app are never asked
     for an executive's code (even if sent back to fix their payment)
   - `…_submission_guards.sql`: BEFORE INSERT triggers on `contact_messages` and
     `sabbir_memories` (the two anon-writable tables) enforcing length caps and a rate
     limit at the database, so the contact form and memorial can't be flooded through
     the public API
   - `…_rsvp_fields.sql`: per-event RSVP config — `audience` (IUB-only vs open), which
     standard fields to collect (`rsvp_fields`) and custom questions (`rsvp_questions`),
     plus an `answers` column on registrations; `register_for_event` enforces the audience
     and required fields/questions
2. **Load the starting content**: paste `seed/faculty.sql`, then `seed/content.sql`, into
   the SQL editor. For members, see **Members** below (the import and executive codes). (`content.sql` copies the team, alumni, story chapters, developers,
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
5. **Let alumni connect a personal Gmail.** Authentication > Sign In / Providers >
   "Allow manual linking": on. Members can then connect a second Google account on
   their profile and keep signing in after their IUB email is gone.
6. **Set the environment variables** from `.env.example` in `.env.local` and on Vercel,
   including `MEMBER_CARD_SECRET` (any long random text) for the QR codes on member cards.
7. **Make the first Master Admin**, once, in the SQL editor (use their Google email):
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
| **Membership Manager** | Opening and closing registration, approving new members (checking their bKash or cash payment), sending a registration back with a note, marking members lapsed, the member list and CSV, executive codes, and moderating what members show publicly: fixing names, removing photos or bios, hiding someone from the public list or directory, and fixing or removing imported members |

There must always be at least one Master Admin; the last one can't be removed.

## Good to know

- **Nothing is deleted from the panel** except event photos, log drafts, RSVPs (cancelled),
  roles, and alumni and former advisors (Delete, after a confirmation). Everything else is
  hidden or unpublished, so it can be brought back.
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

## Members

**Bringing over the registration app's members (once):**

1. In the registration app's admin dashboard, download the members CSV (per term is
   fine).
2. Run `node scripts/members-import.mjs <the CSV files>`. It writes
   `supabase/seed/members-import.sql`, which holds personal details: it's git-ignored,
   so don't commit or share it.
3. Paste it into the SQL editor. Everyone gets a member number in registration order.
   Running it again later only adds people who aren't there yet.

Each of them becomes a member here (approved, with their number) the first time they
sign in with their IUB email. Until then they're listed under **Admin > Members > Not
signed in yet**.

**Opening and closing registration:** the switch at the top of **Admin > Members**. While
it's closed, the Join page says we're not recruiting members this semester and points to
the club's Facebook page; members can still sign in. The database refuses new
registrations while it's closed.

**Executive codes:** after paying, a member enters the code an executive gave them.
Manage them in **Admin > Members > Executive codes**: the codes members
already used on the old app are listed there, ready to be named and switched on. Until
there's at least one code, any code is accepted.

**How it works:**

- **Joining** is at `/join`: members sign in with their IUB Google account (7-digit ID
  @iub.edu.bd), fill in the same details as the registration app, and pay by bKash or
  cash. They're **pending** until a Membership Manager approves them in
  **Admin > Members**, which emails them and gives them a member number. Once `/join`
  is live, point the registration app's address at it.
- **Profiles** (`/account`): members edit their details, add a photo (cropped, at most
  1 MB, in the `avatars` bucket), connect a personal Google account for after
  graduation, and can choose to appear in the members-only **directory** (`/members`),
  which never shows phone numbers, emails or addresses.
- **Team Jukti** (`/team`) lists every member publicly (name, department, intake and photo; never contact details or IDs). Members can hide themselves with a switch on their profile.
- **Member cards** (`/account/card`) have a QR code. At events, Event Managers open the
  event in the panel, go to **Door check-in**, and scan it (or type the member number).
- **Activity** (`/account/activity`) lists their RSVPs and helpline posts; events they
  were checked in at have a printable certificate.
- **Master Admins** can give a member an admin role from the member's page.

## Tickets and paid events

- **Anyone with a Google account can RSVP**, guests from outside IUB included: the IUB
  student ID is optional (filled in automatically for IUB student emails). Guests show
  as "Guest" in the RSVP list.
- **Every RSVP gets a ticket**, e.g. `JT-7K3M9Q`: shown with its QR code on the event
  page (and in *My activity*), and emailed when they register. Members and non-members
  alike. A ticket only works at its own event.
- **Paid events:** set a fee (and optionally a bKash number and a note) in the event's
  Details. Attendees register, pay by bKash with their ticket code as the reference, and
  enter the number they paid from on the event page. Under **RSVPs**, filter
  "Payment not confirmed", check the bKash statement and press **Mark paid**: they get a
  "payment confirmed" email, and their ticket works at the entry. Cash? Mark paid anyway.
  Until then, scanning their ticket shows "Not paid" and doesn't let them in. The fee
  applies to RSVPs made after it's set.
- Emails follow the same rule as the rest of the site: only the production site emails
  attendees; anywhere else they go to the club inbox, marked as a test.

## Event day: check-in and food

Open the event in **Admin > Events > Check-in & food** (Event Managers):

- **Stations:** add one for each thing given out once per person (Lunch, Snacks,
  T-shirt). The entry is always there.
- **Scanning:** pick where you're standing (Entry, or a station), start the camera and
  scan each person's ticket QR (or their member card), or type the ticket code or member number. Green means let
  them in / serve them; red means they've already had it (with the time); amber means no
  confirmed RSVP. Each scan is decided in the database in one step, so two phones
  scanning the same card can't both let someone through. Someone scanned at a station
  who skipped the entry scan is checked in at the same time.
- **Who's here:** live counts (checked in, served at each station) and everyone confirmed,
  with their times. It refreshes every 15 seconds. People without a member card can be
  checked in or marked here by hand, and mistakes undone. The RSVP CSV includes a column
  per station.

