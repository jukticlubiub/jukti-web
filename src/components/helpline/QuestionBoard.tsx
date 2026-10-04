"use client";

import { useId, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { type HelplineQuestion, type HelplineTopic, helplineTopicLabels, helplineTopics } from "@/lib/helpline/types";
import { QuestionCard } from "./QuestionCard";

/** Questions shown before "Show more". */
const PAGE = 8;

type Status = "all" | "open" | "answered";
const statuses: [Status, string][] = [
  ["all", "All"],
  ["open", "Unanswered"],
  ["answered", "Answered"],
];

function matches(question: HelplineQuestion, query: string) {
  return `${question.title} ${question.body} ${question.course ?? ""} ${helplineTopicLabels[question.topic]}`
    .toLowerCase()
    .includes(query);
}

function emptyMessage(status: Status, topic: HelplineTopic | null, query: string) {
  const which = `questions${topic ? ` in ${helplineTopicLabels[topic]}` : ""}`;
  if (query) {
    const among = status === "open" ? " among those waiting for an answer" : status === "answered" ? " among the answered ones" : "";
    return `No ${which} match “${query}”${among}.`;
  }
  return status === "answered" ? `No ${which} have been answered yet.` : `No ${which} are waiting for an answer.`;
}

export const pillClass = (active: boolean) =>
  cn(
    "h-10 rounded-full border px-4 text-[0.9rem] whitespace-nowrap transition-[background-color,border-color,color] duration-200",
    active ? "border-flare bg-lava text-white" : "border-glass-border bg-glass text-body hover:border-flare/50 hover:text-fg",
  );

/** The board: every question, newest first, filterable by whether it's answered and by topic, and searchable. */
export function QuestionBoard({ questions }: { questions: HelplineQuestion[] }) {
  const [status, setStatus] = useState<Status>("all");
  const [topic, setTopic] = useState<HelplineTopic | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const searchId = useId();

  const q = query.trim().toLowerCase();
  const filtering = status !== "all" || topic !== null || q !== "";
  const found = questions.filter(
    (question) =>
      (status === "all" || (status === "answered") === question.answerCount > 0) &&
      (!topic || question.topic === topic) &&
      (!q || matches(question, q)),
  );
  const visible = found.slice(0, shown);
  const topics = helplineTopics.filter((t) => questions.some((question) => question.topic === t));
  const unanswered = questions.filter((question) => question.answerCount === 0).length;

  const clear = () => {
    setStatus("all");
    setTopic(null);
    setQuery("");
  };

  return (
    <section aria-labelledby="questions-title" className="min-w-0">
      {/* Side by side, except beside the ask panel on narrower laptops. */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch xl:flex-row xl:items-end">
        <SectionHeading id="questions-title" title="Questions" count={questions.length} />
        <Reveal delay={0.05}>
          <label htmlFor={searchId} className="sr-only">
            Search questions
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Search questions"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none sm:w-60 lg:w-full xl:w-60"
          />
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-7 grid gap-3">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {statuses.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setShown(PAGE);
              }}
              className={pillClass(status === value)}
            >
              {label}
              {value === "open" && unanswered > 0 && (
                <span className={cn("ml-2 tabular-nums", status === value ? "text-white/80" : "text-flare")}>{unanswered}</span>
              )}
            </button>
          ))}
        </div>
        {topics.length > 1 && (
          <div role="group" aria-label="Topic" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => {
                  setTopic(topic === t ? null : t);
                  setShown(PAGE);
                }}
                className={cn(pillClass(topic === t), "h-9 text-[0.85rem]")}
              >
                {helplineTopicLabels[t]}
              </button>
            ))}
          </div>
        )}
      </Reveal>

      <p role="status" className="sr-only">
        {filtering ? `${found.length} ${found.length === 1 ? "question" : "questions"} found` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-8 grid gap-4">
          {visible.map((question, i) => (
            <Reveal as="li" key={question.id} delay={Math.min(i, 4) * 0.05}>
              <QuestionCard question={question} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-10 text-body">
          <p className="text-lg">
            {questions.length === 0 ? "No questions yet. Be the first to ask!" : emptyMessage(status, topic, query.trim())}
          </p>
          {filtering && (
            <button type="button" onClick={clear} className="mt-3 text-flare underline underline-offset-4 hover:text-fg">
              Clear filters
            </button>
          )}
        </div>
      )}

      {found.length > visible.length && (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="btn-pill btn-ghost">
            Show more questions
            <span className="text-muted tabular-nums">({found.length - visible.length})</span>
          </button>
        </div>
      )}
    </section>
  );
}
