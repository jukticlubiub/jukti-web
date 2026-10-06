/** Admin roles, the areas of the panel, and which role owns each area. Safe to import anywhere. */

export const adminRoles = ["master_admin", "event_manager", "pr_editor", "academic_coordinator", "team_manager", "membership_manager"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const roleInfo: Record<AdminRole, { label: string; description: string }> = {
  master_admin: { label: "Master Admin", description: "Everything, including people and roles, site settings and the activity log." },
  event_manager: { label: "Event Manager", description: "Creates and runs events, and manages their RSVPs." },
  pr_editor: { label: "PR Editor", description: "Jukti Logs, event recaps and galleries, the About story, memories and the inbox." },
  academic_coordinator: { label: "Academic Coordinator", description: "Helpline moderation, the faculty directory and helpline seniors." },
  team_manager: { label: "Team Manager", description: "The executive panel, faculty advisors and alumni." },
  membership_manager: { label: "Membership Manager", description: "Approves new members, manages executive codes, and moderates what members show publicly (photos, names, bios)." },
};

export type AdminArea =
  | "events"
  | "logs"
  | "story"
  | "memories"
  | "messages"
  | "helpline"
  | "faculty"
  | "seniors"
  | "members"
  | "team"
  | "alumni"
  | "developers"
  | "memorial"
  | "settings"
  | "users"
  | "activity";

/** The role that owns each area (master admins can do everything). */
export const areaRole: Record<AdminArea, AdminRole> = {
  events: "event_manager",
  logs: "pr_editor",
  story: "pr_editor",
  memories: "pr_editor",
  messages: "pr_editor",
  helpline: "academic_coordinator",
  faculty: "academic_coordinator",
  seniors: "academic_coordinator",
  members: "membership_manager",
  team: "team_manager",
  alumni: "team_manager",
  developers: "master_admin",
  memorial: "master_admin",
  settings: "master_admin",
  users: "master_admin",
  activity: "master_admin",
};

export function canAccess(roles: readonly AdminRole[], area: AdminArea) {
  return roles.includes("master_admin") || roles.includes(areaRole[area]);
}

/** PR Editors document past events (recaps and galleries) from the events area too. */
export function canOpenEvents(roles: readonly AdminRole[]) {
  return canAccess(roles, "events") || roles.includes("pr_editor");
}

export type NavItem = { area: AdminArea | "dashboard"; label: string; href: string };
export type NavGroup = { title: string; items: NavItem[] };

export const adminNav: NavGroup[] = [
  { title: "Overview", items: [{ area: "dashboard", label: "Dashboard", href: "/admin" }] },
  {
    title: "Events & stories",
    items: [
      { area: "events", label: "Events", href: "/admin/events" },
      { area: "logs", label: "Jukti Logs", href: "/admin/logs" },
      { area: "story", label: "About story", href: "/admin/story" },
      { area: "memories", label: "Memories", href: "/admin/memories" },
      { area: "messages", label: "Inbox", href: "/admin/messages" },
    ],
  },
  {
    title: "Academic Helpline",
    items: [
      { area: "helpline", label: "Questions", href: "/admin/helpline" },
      { area: "faculty", label: "Faculty", href: "/admin/faculty" },
      { area: "seniors", label: "Seniors", href: "/admin/seniors" },
    ],
  },
  {
    title: "People",
    items: [
      { area: "members", label: "Members", href: "/admin/members" },
      { area: "members", label: "Executive codes", href: "/admin/members/executives" },
      { area: "team", label: "Team", href: "/admin/team" },
      { area: "alumni", label: "Alumni & advisors", href: "/admin/alumni" },
      { area: "developers", label: "Developers", href: "/admin/developers" },
    ],
  },
  {
    title: "Site",
    items: [
      { area: "memorial", label: "Memorial page", href: "/admin/memorial" },
      { area: "settings", label: "Settings", href: "/admin/settings" },
      { area: "users", label: "People & roles", href: "/admin/users" },
      { area: "activity", label: "Activity log", href: "/admin/activity" },
    ],
  },
];

/** The nav, trimmed to what these roles may open. */
export function navFor(roles: readonly AdminRole[]): NavGroup[] {
  return adminNav
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.area === "dashboard" || (i.area === "events" ? canOpenEvents(roles) : canAccess(roles, i.area))),
    }))
    .filter((g) => g.items.length > 0);
}
