"use client";

import { useActionState, useState } from "react";
import { hidePost, type HideState } from "@/lib/helpline/actions";
import type { HelplineAnswer } from "@/lib/helpline/types";

/** For club editors: take a question or an answer off the board (it's hidden, not deleted). */
export function ModerationPanel({ questionId, answers }: { questionId: string; answers: HelplineAnswer[] }) {
  const [result, action, pending] = useActionState(hidePost, {} as HideState);
  const [confirming, setConfirming] = useState<string | null>(null);

  const items: { kind: "question" | "answer"; id: string; label: string; name: string }[] = [
    { kind: "question", id: questionId, label: "This question (and its answers)", name: "Hide this question" },
    ...answers.map((a) => ({
      kind: "answer" as const,
      id: a.id,
      label: `Answer by ${a.authorName}: “${excerpt(a.body)}”`,
      name: `Hide the answer by ${a.authorName}`,
    })),
  ];

  return (
    <details className="rounded-[16px] border border-dashed border-glass-border p-5 text-[0.92rem] open:bg-white/[0.02]">
      <summary className="cursor-pointer text-muted marker:text-flare hover:text-fg">Moderator tools</summary>
      <p className="mt-3 text-muted">Hidden posts disappear from the site. They stay in the database, where they can be restored.</p>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-white/[0.03] px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-body">{item.label}</span>
            {confirming === item.id ? (
              <form action={action} className="flex items-center gap-3">
                <input type="hidden" name="kind" value={item.kind} />
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" disabled={pending} className="text-[#ff8f7a] hover:underline">
                  {pending ? "Hiding…" : "Yes, hide"}
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="text-muted hover:text-fg">
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" aria-label={item.name} onClick={() => setConfirming(item.id)} className="text-flare hover:underline">
                Hide
              </button>
            )}
          </li>
        ))}
      </ul>
      {result.error && (
        <p role="alert" className="mt-3 text-[#ff8f7a]">
          {result.error}
        </p>
      )}
    </details>
  );
}

function excerpt(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}
