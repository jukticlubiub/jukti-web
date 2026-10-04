"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { ArrowIcon, CheckIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { askQuestion, type AskFormState } from "@/lib/helpline/actions";
import { helplineLimits as limits, helplinePath, helplineTopicLabels, helplineTopics } from "@/lib/helpline/types";
import type { HelplineViewerState } from "@/lib/helpline/viewer";
import { Counter, Field, FieldError, FormError, inputClass, RadioPill } from "./fields";

/**
 * "Ask a question": sign in with Google, then write the question. Posting puts it on the
 * board straight away and emails the CSE faculty (see lib/helpline/actions.ts).
 */
export function AskPanel({ state, signInFailed = false }: { state: HelplineViewerState; signInFailed?: boolean }) {
  // A new key after "Ask another" starts a fresh form.
  const [round, setRound] = useState(0);
  return (
    <div className="glass-card p-6 sm:p-7">
      <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">Ask a question</p>
      <AskBody key={round} state={state} signInFailed={signInFailed} onAgain={() => setRound((r) => r + 1)} />
      {state.mode === "preview" && (
        <p className="mt-6 text-[0.8rem] leading-relaxed text-muted">
          Preview mode: Supabase isn’t connected, so you’re signed in as a test student and questions are kept on this dev
          server until it restarts. Emails go to the club inbox (or the terminal), never to faculty. This note is only shown in
          development.
        </p>
      )}
    </div>
  );
}

function AskBody({ state, signInFailed, onAgain }: { state: HelplineViewerState; signInFailed: boolean; onAgain: () => void }) {
  const [result, action, pending] = useActionState(askQuestion, { status: "idle" } as AskFormState);
  const [titleLength, setTitleLength] = useState(result.values?.title?.length ?? 0);
  const [bodyLength, setBodyLength] = useState(result.values?.body?.length ?? 0);
  const { viewer, mode } = state;
  const values = result.values ?? {};
  const errors = result.fieldErrors ?? {};

  if (result.status === "posted" && result.questionId) {
    return <Posted questionId={result.questionId} email={mode === "live" ? viewer?.email : undefined} onAgain={onAgain} />;
  }

  if (mode === "off") {
    return (
      <>
        <Heading>Opening soon</Heading>
        <Text>
          Asking online isn’t open yet. Until then, you can find your faculty’s room and email in the{" "}
          <Link href="/helpline/faculty" className="text-flare underline-offset-4 hover:underline">
            faculty directory
          </Link>
          .
        </Text>
      </>
    );
  }

  if (!viewer) {
    return (
      <>
        <Heading>Stuck on something?</Heading>
        <Text>
          Sign in with Google to ask. Your question goes on the board for JUKTI seniors, and the CSE faculty get an email asking
          for their help. You can post anonymously.
        </Text>
        <GoogleSignIn next="/helpline#ask" className="mt-6" />
        {signInFailed && <p role="alert" className="mt-3 text-[0.92rem] text-[#ff8f7a]">Sign-in didn’t complete. Please try again.</p>}
      </>
    );
  }

  return (
    <>
      <Heading>Stuck on something?</Heading>
      {mode === "live" ? (
        <form action={signOut} className="mt-3 flex flex-wrap items-center gap-x-2 text-[0.9rem] text-muted">
          <input type="hidden" name="next" value="/helpline" />
          <span>
            Asking as <span className="text-body">{viewer.name || viewer.email}</span>
          </span>
          <button type="submit" className="text-flare underline-offset-4 hover:underline">
            Sign out
          </button>
        </form>
      ) : (
        <p className="mt-3 text-[0.9rem] text-muted">
          Asking as <span className="text-body">{viewer.name}</span>
        </p>
      )}

      <form action={action} noValidate className="mt-6 grid gap-5">
        <fieldset>
          <legend className="mb-2.5 text-[0.85rem] text-muted">Topic</legend>
          <div className="flex flex-wrap gap-2">
            {helplineTopics.map((topic) => (
              <RadioPill key={topic} name="topic" value={topic} defaultChecked={values.topic === topic}>
                {helplineTopicLabels[topic]}
              </RadioPill>
            ))}
          </div>
          {errors.topic && <FieldError>{errors.topic}</FieldError>}
        </fieldset>

        <Field label="Course (optional)" error={errors.course}>
          {(props) => (
            <input
              {...props}
              name="course"
              maxLength={limits.course.max}
              placeholder="e.g. CSE 203"
              autoComplete="off"
              defaultValue={values.course}
              className={cn(inputClass, "h-12")}
            />
          )}
        </Field>

        <Field label="Your question" hint={<Counter length={titleLength} max={limits.title.max} />} error={errors.title}>
          {(props) => (
            <input
              {...props}
              name="title"
              maxLength={limits.title.max}
              placeholder="In one line, what do you want to know?"
              autoComplete="off"
              defaultValue={values.title}
              onInput={(e) => setTitleLength(e.currentTarget.value.length)}
              className={cn(inputClass, "h-12")}
            />
          )}
        </Field>

        <Field label="Details" hint={<Counter length={bodyLength} max={limits.body.max} />} error={errors.body}>
          {(props) => (
            <textarea
              {...props}
              name="body"
              rows={6}
              maxLength={limits.body.max}
              placeholder="What have you tried so far? Include the error message, your code, or the part of the lecture you’re stuck on."
              defaultValue={values.body}
              onInput={(e) => setBodyLength(e.currentTarget.value.length)}
              className={cn(inputClass, "min-h-40 resize-y py-3.5 leading-relaxed")}
            />
          )}
        </Field>

        <label className="flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-glass-border bg-white/[0.03] p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-flare">
          <input type="checkbox" name="anonymous" defaultChecked={values.anonymous} className="peer sr-only" />
          {/* The switch */}
          <span
            aria-hidden
            className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full border border-glass-border bg-white/10 transition-colors duration-200 peer-checked:border-flare peer-checked:bg-lava after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:transition-transform after:duration-200 peer-checked:after:translate-x-4"
          />
          <span className="text-[0.95rem] leading-snug">
            <span className="text-fg">Post anonymously</span>
            <span className="mt-1 block text-[0.85rem] text-muted">
              Your name is hidden on the board and in the faculty email. Only the club’s admins can see who asked.
            </span>
          </span>
        </label>

        {result.error && <FormError>{result.error}</FormError>}

        <button type="submit" disabled={pending} className="btn-pill btn-primary w-full disabled:opacity-70">
          {pending ? "Posting…" : "Post question"}
          {!pending && <ArrowIcon />}
        </button>
        <p className="-mt-1 text-[0.85rem] leading-relaxed text-muted">
          Every new question is emailed to the CSE faculty. Ask about ideas and approaches, not for answers to graded work.
        </p>
      </form>
    </>
  );
}

function Posted({ questionId, email, onAgain }: { questionId: string; email?: string; onAgain: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center py-6 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid size-16 place-items-center rounded-full bg-lava text-white shadow-[0_0_44px_rgb(245_124_72/0.7)]"
      >
        <CheckIcon className="size-7" />
      </motion.span>
      <h2 className="mt-6 font-heading text-[clamp(1.3rem,1.7vw,1.6rem)]">Question posted!</h2>
      <p className="mt-3 max-w-sm leading-relaxed text-body">
        It’s on the board now, and the CSE faculty have been emailed.
        {email ? (
          <>
            {" "}
            We’ll email you at <span className="text-fg">{email}</span> when someone answers.
          </>
        ) : null}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href={helplinePath(questionId)} className="btn-pill btn-primary text-[0.85rem]">
          View your question
          <ArrowIcon />
        </Link>
        <button type="button" onClick={onAgain} className="btn-pill btn-ghost text-[0.85rem]">
          Ask another
        </button>
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-2.5 font-heading text-[clamp(1.35rem,1.7vw,1.65rem)] leading-[1.15]">{children}</h2>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[1rem] leading-relaxed text-body">{children}</p>;
}
