import { Suspense } from "react";
import { LogEditor } from "@/components/admin/logs/LogEditor";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "New log" };

export default function NewLogPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewLog />
    </Suspense>
  );
}

async function NewLog() {
  const admin = await requireArea("logs");
  return (
    <>
      <PageHeader title="New log" back={{ href: "/admin/logs", label: "Jukti Logs" }} />
      <Panel>
        <LogEditor live={admin.mode === "live"} />
      </Panel>
    </>
  );
}
