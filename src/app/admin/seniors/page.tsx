import { Suspense } from "react";
import { AddSeniorForm, RemoveSeniorButton } from "@/components/admin/AcademicForms";
import { Cell, Empty, PageHeader, PageSkeleton, Panel, Row, Table, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listSeniors } from "@/lib/admin/data/academic";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Helpline seniors" };

export default function SeniorsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Seniors />
    </Suspense>
  );
}

async function Seniors() {
  const admin = await requireArea("seniors");
  const seniors = await listSeniors(admin);
  return (
    <>
      <PageHeader title="Helpline seniors" description="Senior students who can answer helpline questions, with a Senior badge. They sign in with this Google email." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {seniors.length === 0 ? (
          <Empty title="No seniors yet">{admin.mode === "preview" ? "The list is saved in Supabase." : "Add the first one."}</Empty>
        ) : (
          <Table head={["Name", "Email", "Added", ""]}>
            {seniors.map((s) => (
              <Row key={s.email}>
                <Cell className="text-fg">{s.name}</Cell>
                <Cell label="Email" className="text-body/85">{s.email}</Cell>
                <Cell label="Added" className="text-muted">{formatWhen(s.createdAt, false)}</Cell>
                <Cell>
                  <RemoveSeniorButton email={s.email} />
                </Cell>
              </Row>
            ))}
          </Table>
        )}
        <Panel title="Add a senior">
          <AddSeniorForm />
        </Panel>
      </div>
    </>
  );
}
