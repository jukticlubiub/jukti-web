import { Suspense } from "react";
import { Panel, PageHeader, Stat, formatWhen, PageSkeleton } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getDashboard } from "@/lib/admin/data/dashboard";
import { getActivity } from "@/lib/admin/data/users";
import { roleInfo } from "@/lib/admin/roles";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const admin = await requireArea(() => true);
  const [d, activity] = await Promise.all([getDashboard(admin), admin.roles.includes("master_admin") ? getActivity(admin, 8) : Promise.resolve([])]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.name.split(" ")[0]}`}
        description={`You can manage: ${admin.roles.map((r) => roleInfo[r].description.replace(/\.$/, "").toLowerCase()).join("; ")}.`}
      />

      <div className="grid gap-8">
        {d.events && (
          <Section title="Events">
            <Stat label="Upcoming events" value={d.events.upcoming} href="/admin/events" />
            <Stat label="Drafts" value={d.events.drafts} hint="Not published yet" href="/admin/events" />
            {d.events.next && (
              <Stat
                label="Next event"
                value={`${d.events.next.registered}${d.events.next.capacity ? ` / ${d.events.next.capacity}` : ""}`}
                hint={`RSVPs for ${d.events.next.title}, ${formatWhen(d.events.next.startsAt, false)}`}
                href={`/admin/events/${d.events.next.id}`}
                tone="orange"
              />
            )}
          </Section>
        )}

        {d.pr && (
          <Section title="Stories & messages">
            <Stat label="New messages" value={d.pr.newMessages} href="/admin/messages" tone={d.pr.newMessages ? "orange" : undefined} />
            <Stat label="Memories to review" value={d.pr.pendingMemories} href="/admin/memories" tone={d.pr.pendingMemories ? "orange" : undefined} />
            <Stat label="Log drafts" value={d.pr.draftLogs} href="/admin/logs" />
            <Stat label="Past events without a recap" value={d.pr.undocumented} hint="Write them up in Events" href="/admin/events?view=past" />
          </Section>
        )}

        {d.academic && (
          <Section title="Academic Helpline">
            <Stat label="Unanswered questions" value={d.academic.unanswered} href="/admin/helpline" tone={d.academic.unanswered ? "orange" : undefined} />
            <Stat label="Hidden posts" value={d.academic.hidden} href="/admin/helpline?show=hidden" />
            <Stat label="Faculty in the directory" value={d.academic.faculty} href="/admin/faculty" />
          </Section>
        )}

        {d.team && (
          <Section title="People">
            <Stat label="Team members" value={d.team.members} href="/admin/team" />
            <Stat label="Alumni" value={d.team.alumni} href="/admin/alumni" />
          </Section>
        )}

        {d.master && (
          <Panel title="Recent activity" actions={<a href="/admin/activity" className="text-[0.85rem] text-flare hover:underline">See all</a>}>
            {activity.length === 0 ? (
              <p className="text-[0.92rem] text-muted">{admin.mode === "preview" ? "The activity log fills up once Supabase is connected." : "No changes yet."}</p>
            ) : (
              <ul className="divide-y divide-glass-border">
                {activity.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-[0.9rem]">
                    <span>
                      <span className="text-fg">{a.actor ?? "Someone"}</span> <span className="text-muted">{a.action}d</span> {a.label ?? a.table}
                    </span>
                    <span className="text-[0.82rem] text-muted">{formatWhen(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[0.78rem] font-medium tracking-[0.14em] text-muted uppercase">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}
