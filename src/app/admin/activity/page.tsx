import { Suspense } from "react";
import { Cell, Empty, PageHeader, Pill, Row, Table, formatWhen, PageSkeleton } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getActivity } from "@/lib/admin/data/users";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Activity log" };

const tableNames: Record<string, string> = {
  events: "Event",
  event_photos: "Gallery photo",
  event_registrations: "RSVP",
  logs: "Log",
  faculty: "Faculty",
  helpline_seniors: "Senior",
  helpline_questions: "Helpline question",
  helpline_answers: "Helpline answer",
  sabbir_memories: "Memory",
  team_members: "Team member",
  alumni: "Alumnus",
  story_chapters: "Story chapter",
  developers: "Developer",
  site_settings: "Setting",
  user_roles: "Role",
  contact_messages: "Message",
};

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Activity />
    </Suspense>
  );
}

async function Activity() {
  const admin = await requireArea("activity");
  const entries = await getActivity(admin);

  return (
    <>
      <PageHeader title="Activity log" description="Every change made from the admin panel: who, what and when. The latest 200 are shown." />
      {entries.length === 0 ? (
        <Empty title="No activity yet">{admin.mode === "preview" ? "The log fills up once Supabase is connected." : null}</Empty>
      ) : (
        <Table head={["When", "Who", "What", "Item"]}>
          {entries.map((e) => (
            <Row key={e.id}>
              <Cell className="whitespace-nowrap text-muted">{formatWhen(e.at)}</Cell>
              <Cell className="text-fg">{e.actor ?? "—"}</Cell>
              <Cell>
                <Pill tone={e.action === "delete" ? "red" : e.action === "insert" ? "green" : "grey"}>
                  {e.action === "insert" ? "Added" : e.action === "update" ? "Changed" : "Removed"} {tableNames[e.table] ?? e.table}
                </Pill>
              </Cell>
              <Cell className="text-body/85">{e.label ?? e.rowId ?? "—"}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
