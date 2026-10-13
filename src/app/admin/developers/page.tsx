import { Suspense } from "react";
import { DeveloperForm, EditableItem, SortableList } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listDevelopersForAdmin } from "@/lib/admin/data/content";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Developers" };

export default function DevelopersAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Developers />
    </Suspense>
  );
}

async function Developers() {
  const admin = await requireArea("developers");
  const developers = await listDevelopersForAdmin(admin);
  const live = admin.mode === "live";
  return (
    <>
      <PageHeader title="Developers" description="The people credited on /developers.">
        <a href="/developers" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          View page ↗
        </a>
      </PageHeader>
      <div className="grid gap-8">
        <SortableList
          table="developers"
          items={developers.map((d) => ({
            id: d.id,
            node: (
              <EditableItem table="developers" id={d.id} title={d.name} subtitle={`${d.role} · ${d.designation}`} imageUrl={d.photoUrl} shown={d.active}>
                <DeveloperForm developer={d} live={live} />
              </EditableItem>
            ),
          }))}
        />
        <Panel title="Add a developer">
          <DeveloperForm live={live} />
        </Panel>
      </div>
    </>
  );
}
