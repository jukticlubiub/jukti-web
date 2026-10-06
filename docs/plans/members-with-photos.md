# Plan: members with photos on Team Jukti (not built yet)

Client request: *"Team Jukti te Members der add hower jaiga daw with photo same as Alumni"*,
a place to add members with photos, shown like the Alumni section.

## Today

- The "Our Members" section on `/team` lists every approved member automatically (261 so
  far, from the old registration app plus new sign-ups), as small cards with initials.
- A member's photo shows only if they upload one on their profile, so almost none do.
- Admins can't add or change a member's photo, and can't add a member by hand.

## Recommended approach (one list, no duplicates)

1. **Look like the Alumni Network.** Restyle "Our Members" with the alumni item (round photo
   on the lava gradient, name, then department and intake), keeping search, the intake
   filter and "Show all".
2. **Admins add photos.** In Admin > Members:
   - Imported members (*Not signed in yet*): the Edit form gets a photo field (the round
     cropper, saved to the `avatars` bucket under `imports/<email-hash>/photo.webp`).
   - Registered members: the *Public profile* panel gets a photo field next to "Remove
     their photo".
3. **Admins add a member by hand.** An "Add a member" form (name, IUB email, department,
   photo) creates an entry like an imported one: approved and numbered. When that person
   signs in with the email, they take it over (the existing `claim_member_import`).

## Database changes

- `member_imports.photo_url text`, copied to `members.photo_url` by `claim_member_import`.
- `public_members()` returns the import's photo too.
- Storage: Membership Managers may upload to `avatars/imports/…` (today only members can
  write, and only to their own folder).

## Open questions for the client

- Should the section show everyone (261+) or only members with a photo?
- Keep department and intake under the name, or show a role like the alumni do?
