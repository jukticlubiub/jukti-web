import { Suspense } from "react";
import { AlumnusForm, EditableItem } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listAlumniForAdmin } from "@/lib/admin/data/content";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Alumni" };

export default function AlumniAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Alumni />
    </Suspense>
  );
}

async function Alumni() {
  const admin = await requireArea("alumni");
  const alumni = await listAlumniForAdmin(admin);
  const live = admin.mode === "live";
  return (
    <>
      <PageHeader title="Alumni" description="The Alumni Network at the bottom of /team." />
      <div className="grid gap-8">
        <ul className="grid gap-2">
          {alumni.map((a, i) => (
            <EditableItem key={a.id} table="alumni" id={a.id} title={a.name} subtitle={`${a.role} ${a.term}`} imageUrl={a.photoUrl} shown={a.active} first={i === 0} last={i === alumni.length - 1}>
              <AlumnusForm alumnus={a} live={live} />
            </EditableItem>
          ))}
        </ul>
        <Panel title="Add an alumnus">
          <AlumnusForm live={live} />
        </Panel>
      </div>
    </>
  );
}
