import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/forms";
import { ExecutiveForm } from "@/components/admin/MemberAdminForms";
import { Cell, Empty, PageHeader, PageSkeleton, Panel, Pill, Row, Table } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { setExecutiveActive } from "@/lib/admin/actions/members";
import { listExecutives } from "@/lib/admin/data/members";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Executive codes" };

export default function ExecutivesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Executives />
    </Suspense>
  );
}

async function Executives() {
  const admin = await requireArea("members");
  const executives = await listExecutives(admin);
  const known = executives.filter((e) => e.name);
  const unnamed = executives.filter((e) => !e.name);

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-block text-[0.88rem] text-muted hover:text-fg">
        ← Members
      </Link>
      <PageHeader
        title="Executive codes"
        description="After a member pays (bKash or cash), an executive gives them a code to enter when registering. Only codes switched on here are accepted. Until there’s at least one, any code is accepted."
      />

      <div className="grid gap-6">
        {unnamed.length > 0 && (
          <Panel title="Used by members, not added yet" description="Members entered these codes on the old registration app. Add each executive’s name to switch the code on.">
            <ul className="grid gap-5">
              {unnamed.map((e) => (
                <li key={e.code} className="rounded-[14px] border border-glass-border p-4">
                  <p className="mb-3 text-[0.85rem] text-muted">Used by {e.uses} {e.uses === 1 ? "member" : "members"}</p>
                  <ExecutiveForm code={e.code} submitLabel="Add" />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Codes">
          {known.length === 0 ? (
            <Empty title="No codes yet">Add one below, or name the codes members already used above.</Empty>
          ) : (
            <Table head={["Code", "Executive", "Used by", ""]}>
              {known.map((e) => (
                <Row key={e.code}>
                  <Cell>
                    <span className="font-mono text-fg">{e.code}</span>
                    {!e.active && <Pill className="ml-2">Off</Pill>}
                  </Cell>
                  <Cell label="Executive">{e.name}</Cell>
                  <Cell label="Used by" className="text-muted tabular-nums">
                    {e.uses}
                  </Cell>
                  <Cell className="md:text-right">
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <details>
                        <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">Rename</summary>
                        <div className="mt-3 w-[min(28rem,80vw)] rounded-[14px] border border-glass-border bg-[#0e0907] p-4 text-left">
                          <ExecutiveForm code={e.code} name={e.name} active={e.active} submitLabel="Save" />
                        </div>
                      </details>
                      <ActionButton
                        action={setExecutiveActive}
                        fields={{ code: e.code, active: String(!e.active) }}
                        label={e.active ? "Switch off" : "Switch on"}
                        tone={e.active ? "danger" : "ghost"}
                        confirm={e.active ? "New registrations won’t be able to use this code. Continue?" : undefined}
                      />
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>

        <Panel title="Add a code">
          <ExecutiveForm />
        </Panel>
      </div>
    </>
  );
}
