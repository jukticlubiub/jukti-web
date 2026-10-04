import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/forms";
import { Empty, PageHeader, PageSkeleton, Pill, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { setMemoryStatus } from "@/lib/admin/actions/inbox";
import { listMemoriesForAdmin } from "@/lib/admin/data/inbox";
import { memoryRelations } from "@/lib/memories/types";
import { cn } from "@/lib/cn";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Memories" };

const tabs = [
  { value: "pending", label: "To review" },
  { value: "approved", label: "On the page" },
  { value: "hidden", label: "Hidden" },
] as const;

export default function MemoriesAdminPage({ searchParams }: PageProps<"/admin/memories">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Memories searchParams={searchParams} />
    </Suspense>
  );
}

async function Memories({ searchParams }: Pick<PageProps<"/admin/memories">, "searchParams">) {
  const admin = await requireArea("memories");
  const [{ show }, memories] = await Promise.all([searchParams, listMemoriesForAdmin(admin)]);
  const tab = tabs.find((t) => t.value === show)?.value ?? "pending";
  const shown = memories.filter((m) => m.status === tab);

  return (
    <>
      <PageHeader
        title="Memories of Dr. Sabbir"
        description="Memories shared on the memorial page appear there only once approved. Read each one with care: it’s a page of remembrance."
      >
        <a href="/about/dr-ali-shihab-sabbir#memories" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          Memorial page ↗
        </a>
      </PageHeader>
      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/memories?show=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-[0.85rem]", tab === t.value ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50")}
          >
            {t.label} <span className="tabular-nums opacity-70">({memories.filter((m) => m.status === t.value).length})</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <Empty title={tab === "pending" ? "Nothing to review" : "None here"}>{admin.mode === "preview" ? "In preview mode, memories shared on the page are shown straight away." : null}</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((m) => (
            <li key={m.id} className="rounded-[18px] border border-glass-border bg-white/[0.025] p-5">
              <p className="leading-relaxed whitespace-pre-line text-body">{m.message}</p>
              <div className="mt-4 border-t border-glass-border pt-3 text-[0.88rem]">
                <p className="text-fg">
                  {m.name} <Pill className="ml-1">{memoryRelations.find((r) => r.value === m.relation)?.label}</Pill>
                </p>
                <p className="mt-1 text-muted">
                  {[m.affiliation, m.email, formatWhen(m.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {m.status !== "approved" && <ActionButton action={setMemoryStatus} fields={{ id: m.id, status: "approved" }} label="Approve" tone="primary" />}
                {m.status !== "hidden" && <ActionButton action={setMemoryStatus} fields={{ id: m.id, status: "hidden" }} label="Hide" tone="danger" confirm={m.status === "approved" ? "Take it off the page?" : undefined} />}
                {m.status === "hidden" && <ActionButton action={setMemoryStatus} fields={{ id: m.id, status: "pending" }} label="Back to review" />}
                {m.email && (
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Your memory of Dr. Sabbir")}`} className="inline-flex h-8 items-center rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">
                    Email {m.name.split(" ")[0]}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
