import { Suspense } from "react";
import { MemorialForm } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getMemorial } from "@/lib/content/queries";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Memorial page" };

export default function MemorialAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Memorial />
    </Suspense>
  );
}

async function Memorial() {
  const admin = await requireArea("memorial");
  const content = await getMemorial();
  return (
    <>
      <PageHeader
        title="Memorial page"
        description="The text, timeline and photos on Dr. Ali Shihab Sabbir’s page. Please change it with care. Memories shared by visitors are reviewed separately."
      >
        <a href="/about/dr-ali-shihab-sabbir" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          View page ↗
        </a>
      </PageHeader>
      <Panel>
        <MemorialForm content={content} live={admin.mode === "live"} />
      </Panel>
    </>
  );
}
