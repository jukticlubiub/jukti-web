import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/forms";
import { LogEditor } from "@/components/admin/logs/LogEditor";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { deleteLog } from "@/lib/admin/actions/logs";
import { getLogForAdmin } from "@/lib/admin/data/logs";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Edit log" };

export default function EditLogPage(props: PageProps<"/admin/logs/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditLog {...props} />
    </Suspense>
  );
}

async function EditLog({ params }: PageProps<"/admin/logs/[id]">) {
  const admin = await requireArea("logs");
  const log = await getLogForAdmin(admin, (await params).id);
  if (!log) notFound();
  return (
    <>
      <PageHeader title={log.title} back={{ href: "/admin/logs", label: "Jukti Logs" }}>
        {log.status === "published" && (
          <a href={`/logs/${log.slug}`} target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
            View on site ↗
          </a>
        )}
        {log.status === "draft" && <ActionButton action={deleteLog} fields={{ id: log.id }} label="Delete draft" confirm="Delete this draft for good?" tone="danger" />}
      </PageHeader>
      <Panel>
        <LogEditor log={log} live={admin.mode === "live"} />
      </Panel>
    </>
  );
}
