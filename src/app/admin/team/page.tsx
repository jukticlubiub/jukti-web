import { Suspense } from "react";
import { BoardTermForm, EditableItem, TeamMemberForm } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listTeamForAdmin } from "@/lib/admin/data/content";
import { getTeam } from "@/lib/content/queries";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Team" };

export default function TeamAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const admin = await requireArea("team");
  const [members, { boardTerm }] = await Promise.all([listTeamForAdmin(admin), getTeam()]);
  const live = admin.mode === "live";
  const groups = [
    { kind: "advisor" as const, title: "Faculty advisors", description: "White cards, shown first." },
    { kind: "executive" as const, title: "Executive panel", description: "Orange cards, also shown on the homepage’s Join Our Community." },
  ];

  return (
    <>
      <PageHeader title="Team" description="The people on /team. Hide someone instead of deleting them when a term ends, then move them to Alumni.">
        <a href="/team" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          View team ↗
        </a>
      </PageHeader>
      <div className="grid gap-8">
        <Panel title="Board term">
          <BoardTermForm term={boardTerm} />
        </Panel>
        {groups.map((g) => {
          const list = members.filter((m) => m.kind === g.kind);
          return (
            <Panel key={g.kind} title={g.title} description={g.description}>
              <ul className="grid gap-2">
                {list.map((m, i) => (
                  <EditableItem key={m.id} table="team_members" kind={g.kind} id={m.id} title={m.name} subtitle={m.role} imageUrl={m.photoUrl} shown={m.active} first={i === 0} last={i === list.length - 1}>
                    <TeamMemberForm member={m} live={live} />
                  </EditableItem>
                ))}
              </ul>
              <details className="mt-4 rounded-[14px] border border-dashed border-glass-border p-4">
                <summary className="cursor-pointer text-[0.9rem] text-flare">Add {g.kind === "advisor" ? "an advisor" : "an executive"}</summary>
                <div className="mt-4">
                  <TeamMemberForm kind={g.kind} live={live} />
                </div>
              </details>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
