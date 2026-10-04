import { AuthorAvatar } from "@/components/logs/Author";
import { cn } from "@/lib/cn";
import type { HelplineAnswer } from "@/lib/helpline/types";
import { RoleBadge } from "./RoleBadge";
import { TimeAgo } from "./TimeAgo";

/** A question's answers, oldest first. Faculty answers carry a warm edge. */
export function AnswerList({ answers }: { answers: HelplineAnswer[] }) {
  return (
    <ol className="grid gap-4">
      {answers.map((answer) => (
        <li
          key={answer.id}
          id={`answer-${answer.id}`}
          className={cn(
            "glass-card scroll-mt-28 p-5 sm:p-7",
            answer.authorRole === "faculty" && "border-flare/30 shadow-[0_24px_60px_-40px_rgb(245_124_72/0.7)]",
          )}
        >
          <div className="flex items-center gap-3">
            <AuthorAvatar author={{ name: answer.authorName, role: null, avatarUrl: null }} />
            <div className="min-w-0 leading-tight">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-fg">{answer.authorName}</span>
                <RoleBadge role={answer.authorRole} />
              </p>
              <TimeAgo iso={answer.createdAt} className="mt-1 block text-[0.88rem] text-muted" />
            </div>
          </div>
          <p className="mt-5 text-[clamp(1rem,1.1vw,1.08rem)] leading-[1.75] break-words whitespace-pre-wrap text-body">{answer.body}</p>
        </li>
      ))}
    </ol>
  );
}
