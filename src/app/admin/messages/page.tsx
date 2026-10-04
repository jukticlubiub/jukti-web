import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/forms";
import { Empty, PageHeader, PageSkeleton, Pill, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { setMessageStatus } from "@/lib/admin/actions/inbox";
import { listMessages } from "@/lib/admin/data/inbox";
import { contactTopics } from "@/lib/contact/topics";
import { cn } from "@/lib/cn";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Inbox" };

const tabs = [
  { value: "open", label: "Open" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
] as const;

export default function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages searchParams={searchParams} />
    </Suspense>
  );
}

async function Messages({ searchParams }: Pick<PageProps<"/admin/messages">, "searchParams">) {
  const admin = await requireArea("messages");
  const [{ show, q }, messages] = await Promise.all([searchParams, listMessages(admin)]);
  const tab = tabs.find((t) => t.value === show)?.value ?? "open";
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const inTab = (s: string) => (tab === "open" ? s === "new" || s === "read" : s === tab);
  const shown = messages.filter((m) => inTab(m.status) && (!query || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(query)));

  return (
    <>
      <PageHeader title="Inbox" description="Messages from the website’s contact form. They’re emailed to the club too; track replies here." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/messages?show=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-[0.85rem]", tab === t.value ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50")}
          >
            {t.label}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="show" value={tab} />
          <input name="q" defaultValue={query} placeholder="Search messages" aria-label="Search messages" className="h-9 w-56 rounded-full border border-glass-border bg-white/[0.04] px-4 text-[0.88rem] text-fg focus:border-flare focus:outline-none" />
        </form>
      </div>
      {shown.length === 0 ? (
        <Empty title="No messages">{admin.mode === "preview" ? "Messages are saved here once Supabase is connected." : null}</Empty>
      ) : (
        <ul className="grid gap-3">
          {shown.map((m) => (
            <li key={m.id} className={cn("rounded-[18px] border bg-white/[0.025] p-5", m.status === "new" ? "border-flare/40" : "border-glass-border")}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-fg">
                  {m.name} <span className="text-[0.88rem] text-muted">&lt;{m.email}&gt;</span>
                </p>
                <span className="flex items-center gap-2 text-[0.82rem] text-muted">
                  {m.status === "new" && <Pill tone="orange">New</Pill>}
                  <Pill>{contactTopics.find((t) => t.value === m.topic)?.label ?? m.topic}</Pill>
                  {formatWhen(m.createdAt)}
                </span>
              </div>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-body/90">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to JUKTI")}&body=${encodeURIComponent(`\n\n> ${m.message.split("\n").join("\n> ")}`)}`}
                  className="inline-flex h-8 items-center rounded-full border border-flare bg-lava px-3 text-[0.8rem] text-white"
                >
                  Reply by email
                </a>
                {m.status === "new" && <ActionButton action={setMessageStatus} fields={{ id: m.id, status: "read" }} label="Mark read" />}
                {m.status !== "replied" && <ActionButton action={setMessageStatus} fields={{ id: m.id, status: "replied" }} label="Mark replied" />}
                {m.status !== "archived" && <ActionButton action={setMessageStatus} fields={{ id: m.id, status: "archived" }} label="Archive" />}
                {m.status === "archived" && <ActionButton action={setMessageStatus} fields={{ id: m.id, status: "read" }} label="Restore" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
