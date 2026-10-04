import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { ChatIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { type HelplineQuestion, helplinePath, helplineTopicLabels } from "@/lib/helpline/types";
import { TimeAgo } from "./TimeAgo";

/** A question on the board: topic and course, title, the start of the question, who asked, and its answers. */
export function QuestionCard({ question }: { question: HelplineQuestion }) {
  return (
    <Link href={helplinePath(question.id)} className="glass-card group block p-5 transition-[border-color] duration-300 hover:border-flare/35 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>{helplineTopicLabels[question.topic]}</Chip>
        {question.course && <Chip className="border-glass-border text-body">{question.course}</Chip>}
      </div>
      <h3 className="mt-4 text-[clamp(1.1rem,1.3vw,1.3rem)] leading-snug font-medium text-fg transition-colors duration-300 group-hover:text-flare">
        {question.title}
      </h3>
      <p className="mt-2 line-clamp-2 leading-relaxed text-body/80">{question.body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.9rem] text-muted">
        <p className="min-w-0 truncate">
          {question.askerName ?? "Anonymous"}
          <span aria-hidden> · </span>
          <TimeAgo iso={question.createdAt} />
        </p>
        <AnswerCount count={question.answerCount} />
      </div>
    </Link>
  );
}

export function AnswerCount({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        count > 0 ? "text-flare" : "text-muted",
        className,
      )}
    >
      <ChatIcon />
      {count === 0 ? "No answers yet" : `${count} ${count === 1 ? "answer" : "answers"}`}
    </span>
  );
}
