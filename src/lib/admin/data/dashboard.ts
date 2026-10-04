import "server-only";
import { sampleEvents } from "@/lib/data/events";
import { sampleQuestions, sampleAnswers } from "@/lib/data/helpline";
import { teamMembers } from "@/lib/data/team";
import { previewMemories } from "@/lib/memories/queries";
import type { Admin } from "../access";
import { adminDb } from "../guard";
import { canAccess, canOpenEvents } from "../roles";

export type Dashboard = {
  events?: { upcoming: number; drafts: number; next: { id: string; title: string; startsAt: string; registered: number; capacity: number | null } | null };
  pr?: { draftLogs: number; pendingMemories: number; newMessages: number; undocumented: number };
  academic?: { unanswered: number; hidden: number; faculty: number };
  team?: { members: number; alumni: number };
  master?: { admins: number };
};

const count = (r: { count: number | null }) => r.count ?? 0;

export async function getDashboard(admin: Admin): Promise<Dashboard> {
  const out: Dashboard = {};
  const now = Date.now();

  if (admin.mode === "preview") {
    if (canOpenEvents(admin.roles)) {
      const upcoming = sampleEvents.filter((e) => Date.parse(e.startsAt) > now).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
      out.events = {
        upcoming: upcoming.length,
        drafts: 0,
        next: upcoming[0] ? { id: upcoming[0].id, title: upcoming[0].title, startsAt: upcoming[0].startsAt, registered: upcoming[0].rsvp.registered, capacity: upcoming[0].rsvp.capacity } : null,
      };
    }
    if (canAccess(admin.roles, "logs")) {
      out.pr = {
        draftLogs: 0,
        pendingMemories: previewMemories().length,
        newMessages: 0,
        undocumented: sampleEvents.filter((e) => Date.parse(e.endsAt) < now && !e.recap).length,
      };
    }
    if (canAccess(admin.roles, "helpline")) {
      out.academic = { unanswered: sampleQuestions.filter((q) => !sampleAnswers.some((a) => a.questionId === q.id)).length, hidden: 0, faculty: 29 };
    }
    if (canAccess(admin.roles, "team")) out.team = { members: teamMembers.length, alumni: 9 };
    if (admin.roles.includes("master_admin")) out.master = { admins: 1 };
    return out;
  }

  const db = await adminDb();
  const iso = new Date(now).toISOString();
  const jobs: Promise<void>[] = [];

  if (canOpenEvents(admin.roles)) {
    jobs.push(
      (async () => {
        const [up, drafts, next] = await Promise.all([
          db.from("events").select("id", { count: "exact", head: true }).gt("starts_at", iso).eq("published", true),
          db.from("events").select("id", { count: "exact", head: true }).eq("published", false),
          db.from("events").select("id, title, starts_at, capacity").gt("starts_at", iso).eq("published", true).order("starts_at").limit(1).maybeSingle(),
        ]);
        let registered = 0;
        if (next.data) {
          const { data } = await db.rpc("event_rsvp_counts", { p_event_ids: [next.data.id] });
          registered = (data as { registered: number }[] | null)?.[0]?.registered ?? 0;
        }
        out.events = {
          upcoming: count(up),
          drafts: count(drafts),
          next: next.data ? { id: next.data.id, title: next.data.title, startsAt: next.data.starts_at, registered, capacity: next.data.capacity } : null,
        };
      })(),
    );
  }
  if (canAccess(admin.roles, "logs")) {
    jobs.push(
      (async () => {
        const [drafts, memories, messages, undocumented] = await Promise.all([
          db.from("logs").select("id", { count: "exact", head: true }).eq("status", "draft"),
          db.from("sabbir_memories").select("id", { count: "exact", head: true }).eq("status", "pending"),
          db.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
          db.from("events").select("id", { count: "exact", head: true }).lt("ends_at", iso).eq("published", true).is("recap", null),
        ]);
        out.pr = { draftLogs: count(drafts), pendingMemories: count(memories), newMessages: count(messages), undocumented: count(undocumented) };
      })(),
    );
  }
  if (canAccess(admin.roles, "helpline")) {
    jobs.push(
      (async () => {
        const [{ data: questions }, faculty] = await Promise.all([
          db.rpc("admin_helpline_questions"),
          db.from("faculty").select("id", { count: "exact", head: true }).eq("active", true),
        ]);
        const qs = (questions as { status: string; answers: number }[] | null) ?? [];
        out.academic = {
          unanswered: qs.filter((q) => q.status === "visible" && q.answers === 0).length,
          hidden: qs.filter((q) => q.status === "hidden").length,
          faculty: count(faculty),
        };
      })(),
    );
  }
  if (canAccess(admin.roles, "team")) {
    jobs.push(
      (async () => {
        const [m, a] = await Promise.all([
          db.from("team_members").select("id", { count: "exact", head: true }).eq("active", true),
          db.from("alumni").select("id", { count: "exact", head: true }).eq("active", true),
        ]);
        out.team = { members: count(m), alumni: count(a) };
      })(),
    );
  }
  if (admin.roles.includes("master_admin")) {
    jobs.push(
      (async () => {
        const { data } = await db.from("user_roles").select("email");
        out.master = { admins: new Set((data as { email: string }[] | null)?.map((r) => r.email)).size };
      })(),
    );
  }
  await Promise.all(jobs);
  return out;
}
