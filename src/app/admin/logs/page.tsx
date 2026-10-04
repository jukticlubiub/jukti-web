import Link from "next/link";
import { Suspense } from "react";
import { Cell, Empty, PageHeader, PageSkeleton, Pill, Row, Table, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listLogsForAdmin } from "@/lib/admin/data/logs";
import { requestTime } from "@/lib/events/now";
import { logCategoryLabels } from "@/lib/logs/types";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Jukti Logs" };

export default function LogsAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Logs />
    </Suspense>
  );
}

async function Logs() {
  const admin = await requireArea("logs");
  const [logs, now] = await Promise.all([listLogsForAdmin(admin), requestTime()]);

  return (
    <>
      <PageHeader title="Jukti Logs" description="Write tutorials, news and recaps. Drafts stay here until you publish them; a future date schedules a post.">
        <Link href="/admin/logs/new" className="btn-pill btn-primary text-[0.8rem]">
          New log
        </Link>
      </PageHeader>
      {logs.length === 0 ? (
        <Empty title="No logs yet">Write the first one.</Empty>
      ) : (
        <Table head={["Title", "Category", "Status", "Updated"]}>
          {logs.map((l) => {
            const scheduled = l.status === "published" && l.publishedAt && Date.parse(l.publishedAt) > now;
            return (
              <Row key={l.id}>
                <Cell>
                  <Link href={`/admin/logs/${l.id}`} className="text-fg hover:text-flare">
                    {l.title}
                  </Link>
                  <span className="block text-[0.8rem] text-muted">by {l.authorName}</span>
                </Cell>
                <Cell label="Category">{logCategoryLabels[l.category]}</Cell>
                <Cell label="Status">
                  {l.status === "draft" ? <Pill tone="orange">Draft</Pill> : scheduled ? <Pill tone="blue">Scheduled {formatWhen(l.publishedAt, false)}</Pill> : <Pill tone="green">Published</Pill>}
                </Cell>
                <Cell label="Updated" className="whitespace-nowrap text-muted">{formatWhen(l.updatedAt, false)}</Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </>
  );
}
