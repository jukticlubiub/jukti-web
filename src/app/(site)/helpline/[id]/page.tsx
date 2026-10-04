import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnswerForm } from "@/components/helpline/AnswerForm";
import { AnswerList } from "@/components/helpline/AnswerList";
import { ModerationPanel } from "@/components/helpline/ModerationPanel";
import { AnswerCount } from "@/components/helpline/QuestionCard";
import { AnswerFormSkeleton, QuestionSkeleton } from "@/components/helpline/skeletons";
import { TimeAgo } from "@/components/helpline/TimeAgo";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AuthorAvatar } from "@/components/logs/Author";
import { Chip } from "@/components/ui/Chip";
import { ArrowIcon, ArrowLeftIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { ShareButton } from "@/components/ui/ShareButton";
import { getAnswers, getQuestion, getQuestions } from "@/lib/helpline/queries";
import { type HelplineAnswer, type HelplineQuestion, helplinePath, helplineTopicLabels } from "@/lib/helpline/types";
import { getHelplineViewer } from "@/lib/helpline/viewer";

// An id that never matches, for builds with no questions yet: Cache Components needs at
// least one param to validate the route. It renders the 404 page.
const NO_QUESTIONS = "__no-questions__";

export async function generateStaticParams() {
  const questions = await getQuestions();
  return questions.length ? questions.map((q) => ({ id: q.id })) : [{ id: NO_QUESTIONS }];
}

export async function generateMetadata({ params }: PageProps<"/helpline/[id]">): Promise<Metadata> {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) return { title: "Question not found" };
  const description = question.body.replace(/\s+/g, " ").slice(0, 160);
  return {
    title: question.title,
    description,
    openGraph: { title: question.title, description, type: "article" },
  };
}

export default function QuestionPage({ params, searchParams }: PageProps<"/helpline/[id]">) {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <Suspense fallback={<QuestionSkeleton />}>
        <QuestionDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const container = "relative mx-auto max-w-[80rem] px-5 lg:px-[clamp(2rem,4vw,5rem)]";

async function QuestionDetail({ params, searchParams }: Pick<PageProps<"/helpline/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) notFound();

  const [answers, all] = await Promise.all([getAnswers(id), getQuestions()]);
  const path = helplinePath(id);

  return (
    <div className={`${container} grid gap-[clamp(3.5rem,5vw,5rem)] pt-[clamp(8rem,11vw,12rem)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]`}>
      <article className="min-w-0">
        <Link href="/helpline" className="inline-flex items-center gap-2 text-[0.95rem] text-muted transition-colors hover:text-fg">
          <ArrowLeftIcon />
          All questions
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <Chip>{helplineTopicLabels[question.topic]}</Chip>
          {question.course && <Chip className="border-glass-border text-body">{question.course}</Chip>}
          <AnswerCount count={question.answerCount} className="ml-1 text-[0.92rem]" />
        </div>

        <h1 className="mt-6 font-heading text-[clamp(1.6rem,2.9vw,3.2rem)] leading-[1.12]">
          <MaskReveal>{question.title}</MaskReveal>
        </h1>

        <Reveal immediate delay={0.2} className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {question.askerName ? (
              <AuthorAvatar author={{ name: question.askerName, role: null, avatarUrl: null }} />
            ) : (
              <span aria-hidden className="grid size-10 place-items-center rounded-full border border-glass-border bg-white/[0.04] text-muted">
                ?
              </span>
            )}
            <div className="leading-tight">
              <p className="text-fg">{question.askerName ? `Asked by ${question.askerName}` : "Asked anonymously"}</p>
              <TimeAgo iso={question.createdAt} className="mt-1 block text-[0.88rem] text-muted" />
            </div>
          </div>
          <ShareButton title={question.title} path={path} />
        </Reveal>

        <Reveal immediate delay={0.3} className="glass-card mt-7 p-6 sm:p-8">
          <p className="text-[clamp(1.02rem,1.15vw,1.15rem)] leading-[1.75] break-words whitespace-pre-wrap text-body">{question.body}</p>
        </Reveal>

        <section id="answers" aria-labelledby="answers-title" className="mt-[clamp(3.5rem,5vw,5rem)] scroll-mt-28">
          <h2 id="answers-title" className="font-heading text-[clamp(1.4rem,2.2vw,2.3rem)]">
            <MaskReveal>
              {answers.length === 0 ? "No answers yet" : `${answers.length} ${answers.length === 1 ? "Answer" : "Answers"}`}
            </MaskReveal>
          </h2>
          {answers.length > 0 ? (
            <div className="mt-7">
              <AnswerList answers={answers} />
            </div>
          ) : (
            <p className="mt-4 max-w-2xl leading-relaxed text-body">
              The CSE faculty have been emailed about this question, and JUKTI seniors check the board regularly. Answers will
              appear here.
            </p>
          )}

          <div className="mt-8 grid gap-6">
            <Suspense fallback={<AnswerFormSkeleton />}>
              <Answering questionId={id} answers={answers} searchParams={searchParams} />
            </Suspense>
          </div>
        </section>
      </article>

      <aside aria-label="More from the helpline" className="grid content-start gap-5 lg:pt-[5.2rem]">
        <MoreQuestions current={question} all={all} />
        <Link href="/helpline#ask" className="glass-card group block p-6">
          <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">Have your own?</p>
          <p className="mt-2.5 font-medium text-fg">Ask the seniors and faculty</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[0.92rem] text-body transition-colors group-hover:text-flare">
            Ask a question
            <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Link>
      </aside>
    </div>
  );
}

async function Answering({
  questionId,
  answers,
  searchParams,
}: {
  questionId: string;
  answers: HelplineAnswer[];
  searchParams: PageProps<"/helpline/[id]">["searchParams"];
}) {
  const [state, params] = await Promise.all([getHelplineViewer(), searchParams]);
  return (
    <>
      <AnswerForm questionId={questionId} state={state} signInFailed={params.signin === "failed"} />
      {state.canModerate && <ModerationPanel questionId={questionId} answers={answers} />}
    </>
  );
}

/** Up to four other questions: the same topic first, then the newest. */
function MoreQuestions({ current, all }: { current: HelplineQuestion; all: HelplineQuestion[] }) {
  const others = all.filter((q) => q.id !== current.id);
  const picks = [...others.filter((q) => q.topic === current.topic), ...others.filter((q) => q.topic !== current.topic)].slice(0, 4);
  if (picks.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h2 className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">More questions</h2>
      <ul className="mt-4 grid divide-y divide-glass-border">
        {picks.map((q) => (
          <li key={q.id}>
            <Link href={helplinePath(q.id)} className="group block py-3.5">
              <span className="line-clamp-2 leading-snug text-fg transition-colors group-hover:text-flare">{q.title}</span>
              <AnswerCount count={q.answerCount} className="mt-1.5 text-[0.85rem]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
