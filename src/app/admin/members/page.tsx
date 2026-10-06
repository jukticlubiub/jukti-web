import Link from "next/link";
import { Suspense } from "react";
import { ActionButton, inputClass } from "@/components/admin/forms";
import { ImportEditForm } from "@/components/admin/MemberAdminForms";
import { removeImport, setImportHidden } from "@/lib/admin/actions/members";
import { Cell, Empty, formatWhen, PageHeader, PageSkeleton, Pill, Row, Table } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getExecutiveNames, type ImportedMember, listImportsForAdmin, listMembersForAdmin } from "@/lib/admin/data/members";
import { cn } from "@/lib/cn";
import { memberStatuses, statusInfo, statusPillTone as pillTone } from "@/lib/members/options";
import { intakeLabel } from "@/lib/members/semester";
import type { Member } from "@/lib/members/types";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Members" };

const tabLabels: Record<(typeof memberStatuses)[number], string> = { pending: "To review", approved: "Members", rejected: "Sent back", lapsed: "Lapsed" };

export default function MembersAdminPage({ searchParams }: PageProps<"/admin/members">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Members searchParams={searchParams} />
    </Suspense>
  );
}

function matches(m: Member, q: string) {
  return [m.name, m.email, m.iubId, m.memberNo, m.secondaryEmail, m.bkashTransactionId, m.bkashSenderNumber, m.contactNumber, m.executiveId].join(" ").toLowerCase().includes(q);
}

async function Members({ searchParams }: Pick<PageProps<"/admin/members">, "searchParams">) {
  const admin = await requireArea("members");
  const [params, members, executives, imported] = await Promise.all([searchParams, listMembersForAdmin(admin), getExecutiveNames(admin), listImportsForAdmin(admin)]);
  if (params.show === "imported") return <Imported imported={imported} executives={executives} counts={counts(members, imported)} q={typeof params.q === "string" ? params.q.trim().toLowerCase() : ""} />;
  const tab = memberStatuses.find((s) => s === params.show) ?? "pending";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const shown = members.filter((m) => m.status === tab && (!q || matches(m, q)));

  return (
    <>
      <PageHeader
        title="Members"
        description="New registrations arrive here. Check the payment, then approve: they get an email and their member card."
      >
        <Link href="/admin/members/executives" className="btn-pill btn-ghost text-[0.8rem]">
          Executive codes
        </Link>
        <a href="/admin/members/members.csv" className="btn-pill btn-ghost text-[0.8rem]">
          Download CSV
        </a>
      </PageHeader>
      {executives.size === 0 && (
        <p className="mb-5 rounded-[14px] border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3 text-[0.92rem] text-body">
          No executive codes are set up, so new registrations can enter any code.{" "}
          <Link href="/admin/members/executives" className="text-flare underline-offset-4 hover:underline">
            Add them
          </Link>
          .
        </p>
      )}
      <Filters tab={tab} q={q} counts={counts(members, imported)} />

      {shown.length === 0 ? (
        <Empty title={q ? "No one matches" : tab === "pending" ? "Nothing to review" : "No one here"} />
      ) : (
        <Table head={["Member", "IUB ID", "Payment", "Executive", "Registered", ""]}>
          {shown.map((m) => (
            <Row key={m.id}>
              <Cell>
                <Link href={`/admin/members/${m.id}`} className="font-medium text-fg hover:text-flare">
                  {m.name}
                </Link>
                <span className="block text-[0.82rem] text-muted">{m.memberNo ?? m.email}</span>
              </Cell>
              <Cell label="IUB ID">
                <span className="tabular-nums">{m.iubId}</span>
                <span className="block text-[0.82rem] text-muted">{intakeLabel(m.iubId)}</span>
              </Cell>
              <Cell label="Payment">
                {m.paymentMethod === "Bkash" ? (
                  <>
                    bKash <span className="text-muted tabular-nums">{m.bkashSenderNumber}</span>
                    {m.bkashTransactionId && <span className="block text-[0.82rem] text-muted tabular-nums">TxID {m.bkashTransactionId}</span>}
                  </>
                ) : (
                  (m.paymentMethod ?? "—")
                )}
              </Cell>
              <Cell label="Executive">{m.executiveId ? (executives.get(m.executiveId) ?? m.executiveId) : "—"}</Cell>
              <Cell label="Registered" className="text-muted">
                {formatWhen(m.createdAt, false)}
              </Cell>
              <Cell className="md:text-right">
                <Pill tone={pillTone[m.status]}>{statusInfo[m.status].label}</Pill>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}

type Tab = (typeof memberStatuses)[number] | "imported";

function counts(members: Member[], imported: ImportedMember[]): Record<Tab, number> {
  return { ...Object.fromEntries(memberStatuses.map((s) => [s, members.filter((m) => m.status === s).length])), imported: imported.length } as Record<Tab, number>;
}

function Filters({ tab, q, counts }: { tab: Tab; q: string; counts: Record<Tab, number> }) {
  const tabs: [Tab, string][] = [...memberStatuses.map((s) => [s, tabLabels[s]] as [Tab, string]), ["imported", "Not signed in yet"]];
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) =>
          value === "imported" && counts.imported === 0 ? null : (
            <Link
              key={value}
              href={`/admin/members?show=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={tab === value ? "page" : undefined}
              className={cn("rounded-full border px-4 py-1.5 text-[0.85rem]", tab === value ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50")}
            >
              {label} <span className="tabular-nums opacity-70">({counts[value]})</span>
            </Link>
          ),
        )}
      </nav>
      <form className="w-full max-w-xs" action="/admin/members">
        <input type="hidden" name="show" value={tab} />
        <input type="search" name="q" defaultValue={q} placeholder="Name, ID, bKash, phone…" aria-label="Search members" className={cn(inputClass, "h-10 rounded-full px-4 text-[0.9rem]")} />
      </form>
    </div>
  );
}

/** Members from the registration app's export who haven't signed in here yet (they're approved; signing in claims it). */
function Imported({ imported, executives, counts, q }: { imported: ImportedMember[]; executives: Map<string, string>; counts: Record<Tab, number>; q: string }) {
  const shown = imported.filter((m) => !q || [m.name, m.email, m.iubId, m.memberNo, m.bkashSenderNumber, m.bkashTransactionId].join(" ").toLowerCase().includes(q));
  return (
    <>
      <PageHeader
        title="Members"
        description="These members registered through the old registration app. They’re already members: the first time they sign in here with their IUB email, their account picks up this registration and number."
      />
      <Filters tab="imported" q={q} counts={counts} />
      {shown.length === 0 ? (
        <Empty title="No one matches" />
      ) : (
        <Table head={["Member", "IUB ID", "Payment", "Executive", "Registered", ""]}>
          {shown.map((m) => (
            <Row key={m.email}>
              <Cell>
                <span className="font-medium text-fg">{m.name}</span>
                {m.hideFromPublic && <Pill className="ml-2">Hidden</Pill>}
                <span className="block text-[0.82rem] text-muted">
                  {m.memberNo} · {m.email}
                </span>
              </Cell>
              <Cell label="IUB ID">
                <span className="tabular-nums">{m.iubId ?? "—"}</span>
              </Cell>
              <Cell label="Payment">
                {m.paymentMethod ?? "—"} {m.bkashSenderNumber && <span className="text-muted tabular-nums">{m.bkashSenderNumber}</span>}
              </Cell>
              <Cell label="Executive">{m.executive ? (executives.get(m.executive) ?? m.executive) : "—"}</Cell>
              <Cell label="Registered" className="text-muted">
                {formatWhen(m.registeredAt, false)}
              </Cell>
              <Cell className="md:text-right">
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <details className="group">
                    <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">Edit</summary>
                    <div className="mt-3 w-[min(28rem,80vw)] rounded-[14px] border border-glass-border bg-[#0e0907] p-4 text-left">
                      <ImportEditForm email={m.email} name={m.name} department={m.department} hidden={m.hideFromPublic} />
                    </div>
                  </details>
                  <ActionButton action={setImportHidden} fields={{ email: m.email, hidden: String(!m.hideFromPublic) }} label={m.hideFromPublic ? "Show publicly" : "Hide"} />
                  <ActionButton action={removeImport} fields={{ email: m.email }} label="Remove" tone="danger" confirm={`Remove ${m.name}? They won’t be a member when they sign in.`} />
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}

