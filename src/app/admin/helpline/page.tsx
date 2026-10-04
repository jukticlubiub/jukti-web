import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/forms";
import { Empty, PageHeader, PageSkeleton, Pill, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { setQuestionStatus } from "@/lib/admin/actions/academic";
import { listQuestionsForAdmin } from "@/lib/admin/data/academic";
import { cn } from "@/lib/cn";
import { helplineTopicLabels, type HelplineTopic } from "@/lib/helpline/types";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Helpline questions" };

const tabs = [
  { value: "unanswered", label: "Unanswered" },
  { value: "answered", label: "Answered" },
  { value: "hidden", label: "Hidden" },
] as const;

export default function HelplineAdminPage({ searchParams }: PageProps<"/admin/helpline">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Questions searchParams={searchParams} />
    </Suspense>
  );
}

async function Questions({ searchParams }: Pick<PageProps<"/admin/helpline">, "searchParams">) {
  const admin = await requireArea("helpline");
  const [{ show, q }, questions] = await Promise.all([searchParams, listQuestionsForAdmin(admin)]);
  const tab = tabs.find((t) => t.value === show)?.value ?? "unanswered";
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const inTab = (x: (typeof questions)[number]) => (tab === "hidden" ? x.status === "hidden" : x.status === "visible" && (tab === "answered" ? x.answers > 0 : x.answers === 0));
  const shown = questions.filter((x) => inTab(x) && (!query || `${x.title} ${x.body} ${x.course ?? ""} ${x.askerName}`.toLowerCase().includes(query)));

  return (
    <>
      <PageHeader
        title="Helpline questions"
        description="Keep the board helpful: hide posts that are abusive, off-topic or ask for graded answers. To hide a single answer, open the question on the site and use Moderator tools."
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/helpline?show=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-[0.85rem]", tab === t.value ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50")}
          >
            {t.label} <span className="tabular-nums opacity-70">({questions.filter(inTabFor(t.value)).length})</span>
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="show" value={tab} />
          <input name="q" defaultValue={query} placeholder="Search questions" aria-label="Search questions" className="h-9 w-56 rounded-full border border-glass-border bg-white/[0.04] px-4 text-[0.88rem] text-fg focus:border-flare focus:outline-none" />
        </form>
      </div>
      {shown.length === 0 ? (
        <Empty title="Nothing here" />
      ) : (
        <ul className="grid gap-3">
          {shown.map((x) => (
            <li key={x.id} className="rounded-[18px] border border-glass-border bg-white/[0.025] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="orange">{helplineTopicLabels[x.topic as HelplineTopic] ?? x.topic}</Pill>
                {x.course && <Pill>{x.course}</Pill>}
                <Pill tone={x.answers ? "green" : "grey"}>{x.answers} {x.answers === 1 ? "answer" : "answers"}</Pill>
                <span className="ml-auto text-[0.82rem] text-muted">{formatWhen(x.createdAt)}</span>
              </div>
              <p className="mt-3 text-[1.05rem] text-fg">{x.title}</p>
              <p className="mt-1.5 line-clamp-3 text-[0.92rem] leading-relaxed whitespace-pre-line text-body/80">{x.body}</p>
              <p className="mt-3 text-[0.85rem] text-muted">
                Asked by {x.askerName}
                {x.askerEmail ? ` (${x.askerEmail})` : ""}
                {x.anonymous ? " · posted anonymously" : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {x.status === "visible" ? (
                  <>
                    <a href={`/helpline/${x.id}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">
                      Open on site ↗
                    </a>
                    <ActionButton action={setQuestionStatus} fields={{ id: x.id, status: "hidden" }} label="Hide" confirm="Hide this question?" tone="danger" />
                  </>
                ) : (
                  <ActionButton action={setQuestionStatus} fields={{ id: x.id, status: "visible" }} label="Restore" tone="primary" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function inTabFor(tab: (typeof tabs)[number]["value"]) {
  return (x: { status: string; answers: number }) => (tab === "hidden" ? x.status === "hidden" : x.status === "visible" && (tab === "answered" ? x.answers > 0 : x.answers === 0));
}
