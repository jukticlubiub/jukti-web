import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import { AskPanel } from "@/components/helpline/AskPanel";
import { HelplineHeader } from "@/components/helpline/HelplineHeader";
import { QuestionBoard } from "@/components/helpline/QuestionBoard";
import { AskSkeleton } from "@/components/helpline/skeletons";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { ArrowIcon, DoorIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import { getQuestions } from "@/lib/helpline/queries";
import { getHelplineViewer } from "@/lib/helpline/viewer";

export const metadata: Metadata = pageMetadata({
  title: "Academic Helpline",
  description:
    "Ask your course questions and doubts. JUKTI seniors and the CSE faculty at IUB answer them on the Academic Helpline.",
  path: "/helpline",
});

const steps = [
  ["Ask", "Sign in with Google and post your question. You can hide your name."],
  ["We reach out", "The CSE faculty get an email about it, and JUKTI seniors see it here."],
  ["Get an answer", "Answers appear under your question, and we email you when one arrives."],
] as const;

export default async function HelplinePage({ searchParams }: PageProps<"/helpline">) {
  const questions = await getQuestions();

  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      <HelplineHeader title="ACADEMIC" accent="HELPLINE" subtitle="Ask. Learn. Get unstuck." active="/helpline">
        <Reveal delay={0.22} className="mt-7 flex flex-wrap justify-center gap-3">
          <a href="#ask" className="btn-pill btn-primary">
            Ask a question
            <ArrowIcon />
          </a>
        </Reveal>
      </HelplineHeader>

      <div className="relative mx-auto grid max-w-[92rem] gap-[clamp(3.5rem,5vw,5rem)] px-5 pt-[clamp(3.5rem,6vw,7rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start lg:px-[clamp(2rem,4vw,5rem)]">
        <aside id="ask" aria-label="Ask a question" className="grid scroll-mt-28 gap-5 lg:order-2">
          <Suspense fallback={<AskSkeleton />}>
            <Ask searchParams={searchParams} />
          </Suspense>

          <Reveal delay={0.1} className="glass-card p-6 sm:p-7">
            <h2 className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">How it works</h2>
            <ol className="mt-5 grid gap-5">
              {steps.map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-flare/45 font-display text-[0.8rem] text-flare">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-fg">{title}</p>
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-body/85">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.15}>
            <Link href="/helpline/faculty" className="glass-card group flex items-center gap-4 p-5 sm:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lava/20 text-flare">
                <DoorIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg transition-colors group-hover:text-flare">Faculty Directory</span>
                <span className="mt-0.5 block text-[0.92rem] text-muted">Rooms and emails of the CSE faculty</span>
              </span>
              <ArrowIcon className="text-muted transition-[color,translate] duration-300 group-hover:translate-x-1 group-hover:text-flare" />
            </Link>
          </Reveal>
        </aside>

        <QuestionBoard questions={questions} />
      </div>
    </div>
  );
}

async function Ask({ searchParams }: Pick<PageProps<"/helpline">, "searchParams">) {
  const [state, params] = await Promise.all([getHelplineViewer(), searchParams]);
  return <AskPanel state={state} signInFailed={params.signin === "failed"} />;
}
