import { Suspense } from "react";
import { AlumnusForm, EditableItem, SortableList } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listAlumniForAdmin } from "@/lib/admin/data/content";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Alumni & former advisors" };

export default function AlumniAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Alumni />
    </Suspense>
  );
}

async function Alumni() {
  const admin = await requireArea("alumni");
  const all = await listAlumniForAdmin(admin);
  const live = admin.mode === "live";
  const advisors = all.filter((a) => a.kind === "former_advisor");
  const alumni = all.filter((a) => a.kind !== "former_advisor");
  return (
    <>
      <PageHeader title="Alumni & former advisors" description="Shown on /team: Former Faculty Advisors, then the Alumni Network. Hide takes someone off the site and keeps them here; Delete removes them for good." />
      <div className="grid gap-10">
        <section className="grid gap-4">
          <h2 className="text-[1.1rem] text-fg">Former faculty advisors</h2>
          {advisors.length > 0 && (
            <SortableList
              table="alumni"
              kind="former_advisor"
              items={advisors.map((a) => ({
                id: a.id,
                node: (
                  <EditableItem table="alumni" id={a.id} title={a.name} subtitle={`${a.role} ${a.term}`} imageUrl={a.photoUrl} shown={a.active} deletable>
                    <AlumnusForm alumnus={a} live={live} />
                  </EditableItem>
                ),
              }))}
            />
          )}
          <Panel title="Add a former faculty advisor">
            <AlumnusForm kind="former_advisor" live={live} />
          </Panel>
        </section>

        <section className="grid gap-4">
          <h2 className="text-[1.1rem] text-fg">Alumni</h2>
          <SortableList
            table="alumni"
            kind="alumnus"
            items={alumni.map((a) => ({
              id: a.id,
              node: (
                <EditableItem table="alumni" id={a.id} title={a.name} subtitle={`${a.role} ${a.term}`} imageUrl={a.photoUrl} shown={a.active} deletable>
                  <AlumnusForm alumnus={a} live={live} />
                </EditableItem>
              ),
            }))}
          />
          <Panel title="Add an alumnus">
            <AlumnusForm live={live} />
          </Panel>
        </section>
      </div>
    </>
  );
}
