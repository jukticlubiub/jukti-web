# Plan: supervisor's feedback (10 points)

Status as of 9 Oct 2026. "Built" means it's on the site already; everything else is planned here.

| # | Feedback | Status | Size |
|---|---|---|---|
| 1 | Home page: no history or story; recent activities, current board, etc. | To do | L |
| 2 | Members' contact info (just email) | To do, needs a decision | M |
| 3 | Alumni designation and company | To do | M (with 8) |
| 4 | Unnecessary line breaks in many places | To do, needs the screenshots | S |
| 5 | Faces covered on mobile (always) and on desktop (on hover) | To do | S |
| 6 | Pre-seeded questions and answers on the Academic Helpline | To do, needs the content | M |
| 7 | In Memoriam out of the navbar, as a call to action on About | To do | S |
| 8 | Alumni sorted by years of service, grouped by board | To do | M (with 3) |
| 9 | A dedicated Gallery of all event photos | To do | M |
| 10 | Past faculty advisors | Built, but empty | Data only |

## Suggested order

1. **Quick fixes:** 7, 5, 4, and filling in 10. Small, low-risk changes the supervisor will notice straight away.
2. **Gallery (9):** a new page from photos we already have (52 photos across 7 events). The new home page uses it too.
3. **Alumni (3 + 8):** one database change for both, then the Team page and the admin form.
4. **Home page (1):** built last, from the pieces above: recent events, the board, the gallery.
5. **Helpline (6) and emails (2):** once the content and the decision are in.

## 1. Home page

**Today:** Hero, "Our History" (four paragraphs about the founding), then "Join Our Community" (the orbit with the executives' photos).

**Plan:**
- Remove "Our History". The story stays on the About page.
- New order:
  1. **Hero** (unchanged).
  2. **Up next:** the next or ongoing event, with date, venue, countdown and RSVP. Reuses the featured-event card from the Events page. If nothing is coming up, it shows the latest event instead.
  3. **Recent activities:** the last 3–4 events as cards (cover photo, date, photo count), plus "See all events".
  4. **Current board:** faculty advisors and executive panel with photos (the item-5 card), plus "Meet the whole team".
  5. **Moments:** a strip of 6–8 event photos linking to the new Gallery (item 9).
  6. **From Jukti Logs:** the latest 2–3 posts.
  7. **Join Our Community** (unchanged).
- Optional: a numbers strip (members, events held, years since 2014). Confirm what "etc." should cover.
- Juro walks down the home page from spot to spot. His stop in "Our History" moves to "Recent activities".
- Everything is cached and refreshes when admins publish events, logs or team changes, so the home page stays fast.

## 2. Members' email addresses

**Decision needed:** which members, and who can see their emails?
- **(a) The executive panel**, so people can contact the board. Low risk: add an `email` field to team members (ideally role addresses, e.g. the club Gmail), shown on the Team page and Contact page.
- **(b) All registered members (263)**, so members can reach each other.

Publishing 263 student emails openly invites spam and scraping. IUB emails also reveal student IDs, and the imported members never agreed to it.

**Recommendation for (b):**
- Show emails in the **members-only directory** (signed-in approved members only).
- On the public Team page list, show an email only for members who switch on "Show my email publicly" on their profile (off by default).
- Show it as a mail link assembled in the browser, to slow down scrapers.

**Work:** a `show_email` setting on members, the profile toggle, email in the directory, and `public_members()` returning the email only when allowed.

## 3 + 8. Alumni: designation, company, years, boards

**Today:**
- 30 alumni, all with role "Executive".
- Years are free text in mixed formats ("2014-2017", "2015 - 2017", "2021-24", "2020-2025").
- No company or job title.

**Database (one migration):**
- Add to `alumni`:
  - `position`: their last JUKTI post (President, General Secretary… or Executive)
  - `start_year` and `end_year`: years of service, as numbers
  - `designation`: job title, e.g. Software Engineer
  - `company`: e.g. Google
- Convert the existing 30 entries automatically: read the years out of the old text and copy "Executive" into `position`.

**Team page:**
- Under each name: **"Software Engineer at Google"**, then **"President · 2021–24"**.
- Alumni are **grouped by the board they last served on**: "Board 2024–25", "Board 2023–24", …
- Newest board first, with a **Newest first / Oldest first** switch.
- Within a board, sorted by post: President, Vice President, General Secretary, …, then Executive, then name.
- Search keeps working, now also by company and designation.
- Former faculty advisors (item 10) get the same years and sort by them.

**Admin (Alumni & advisors):**
- New fields: position, served from / to (years), designation, company.
- Alumni without these yet are flagged, so the Team Manager can see what's missing.

**Later (nice to have):** an "End of term" button on Admin > Team that moves the outgoing executive panel into alumni under that year's board, with their posts and years filled in.

**Data needed:** designation and company for the 30 alumni. A short Google Form to alumni is the quickest way. Their real JUKTI posts are needed too; today everyone says "Executive".

**Decision:** which board do multi-year members go under? Recommended: the **last** board they served on.

## 4. Unnecessary line breaks

**Needs the screenshots** to find the exact places.

**Likely causes:**
- The display font (Michroma) is very wide, so headings wrap to one word per line.
- Some fixed widths are too narrow.
- Paragraphs end with a single orphan word.

**Fix:**
- Site-wide: balanced wrapping for headings and "pretty" wrapping (no orphan words) for paragraphs.
- Then check each page at phone (375px), tablet (768px), laptop (1280px) and wide (1440px+) sizes.
- Loosen any widths that force breaks, and fix each spot from the screenshots.

## 5. Faces covered on the Team cards

**Today:**
- On phones, the name and role always sit on a dark strip over the bottom third of the photo.
- On desktop, an orange gradient and the name fade in over the bottom half on hover.
- Both cover faces, because the photos are tall and the face sits low in the frame.

**Fix:**
- Move the **name and role below the photo**, in a caption bar, on both phone and desktop, so nothing sits on the photo.
- Keep the hover effect (black and white turns to colour) and the LinkedIn badge.
- Add a face guide to the admin cropper for team portraits ("keep the face inside this area"), so new uploads are framed consistently.
- Applies everywhere the card is used: the Team page now, and the home page board in item 1.

## 6. Academic Helpline: pre-seeded questions and answers

**Today:**
- The helpline is empty (0 questions).
- Every question must belong to a signed-in account.
- Answers show as Faculty, Senior or JUKTI (editor).

**Plan:**
- Add an **"Add a Q&A"** form in Admin > Helpline for Academic Coordinators.
- They write a question (topic, course, title, details) and its answer together.
- The question shows as asked anonymously ("A CSE student"). The answer shows the JUKTI badge, or a named faculty member or senior who agreed.
- Questions and answers then live on the normal board and can be edited, hidden or answered further like any other.
- No fake accounts are needed. The Q&A is stored under the coordinator who added it.

**Content needed:** 10–15 common questions across the topics (course help, programming, math, projects and thesis, career). The academic wing should write or approve them. I can draft them for review.

## 7. In Memoriam

- Remove "In Memoriam" from the top menu and the phone menu.
- Keep a quiet link in the footer.
- Add a call to action on the About page:
  - "In memory of Dr. Ali Shihab Sabbir", with his photo and one or two lines on his role in founding JUKTI.
  - A "Visit the memorial page" button.
  - It sits next to the part of the story where he appears.
- The freed menu slot goes to **Gallery** (item 9).

## 9. Gallery

**New page `/gallery`:**
- A masonry (mosaic) grid of every photo from published events, newest events first.
- Filters by year and by event type.
- Clicking a photo opens it full screen, with the event name and a link to the event. This reuses the viewer from the event pages.
- Photos load as you scroll, in sizes that fit the screen. "Show more" after the first 40.
- It updates by itself when a PR Editor adds photos to an event's gallery. Nothing new to manage.
- Added to the menu in place of In Memoriam.
- **Later (optional):** a "feature in Gallery" flag, so the PR team can pick highlights for the home page strip.

## 10. Past faculty advisors

- **Built:** the "Former Faculty Advisors" section on Team Jukti, managed in Admin > Alumni & advisors ("Add a former advisor").
- **Empty right now:** it appears on the site as soon as one is added.
- **Needed from the club:** names, photos and years as advisor.
- After item 8, they'll also be sorted by their years.

## What we need from the supervisor or club

1. The **screenshots** for items 4 and 5.
2. **Item 2:** which members' emails, and public or members-only.
3. **Item 1:** anything else for the home page ("etc.").
4. **Item 8:** confirm grouping by the last board served.
5. **Data:**
   - alumni designations, companies and real posts
   - former advisors' names, photos and years
   - helpline Q&As, or approval of drafted ones
