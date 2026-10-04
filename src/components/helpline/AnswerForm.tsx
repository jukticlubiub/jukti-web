"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { CheckIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { answerQuestion, type AnswerFormState } from "@/lib/helpline/actions";
import { helplineLimits as limits, helplinePath } from "@/lib/helpline/types";
import type { HelplineViewerState } from "@/lib/helpline/viewer";
import { Counter, Field, inputClass, RadioPill } from "./fields";
import { RoleBadge } from "./RoleBadge";

/**
 * Answering, for JUKTI seniors and CSE faculty (and club editors). Everyone else sees
 * who can answer, with a sign-in button if they're signed out.
 */
export function AnswerForm({
  questionId,
  state,
  signInFailed = false,
}: {
  questionId: string;
  state: HelplineViewerState;
  signInFailed?: boolean;
}) {
  const [result, action, pending] = useActionState(answerQuestion, { status: "idle", posted: 0 } as AnswerFormState);
  const { mode, viewer, role } = state;
  const path = helplinePath(questionId);

  if (mode === "off") return null;

  return (
    <div id="answer" className="glass-card scroll-mt-28 p-6 sm:p-7">
      <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">Your answer</p>

      {!viewer ? (
        <>
          <Heading>Can you help?</Heading>
          <Text>Answers come from JUKTI seniors and the CSE faculty. If you’re one of them, sign in with Google to answer.</Text>
          <GoogleSignIn next={`${path}#answer`} className="mt-6 max-w-sm" />
          {signInFailed && <p role="alert" className="mt-3 text-[0.92rem] text-[#ff8f7a]">Sign-in didn’t complete. Please try again.</p>}
        </>
      ) : !role ? (
        <>
          <Heading>Answers come from seniors and faculty</Heading>
          <Text>
            You’re signed in as <span className="text-fg">{viewer.email}</span>, which isn’t on the list of JUKTI seniors or CSE
            faculty. If you should be able to answer,{" "}
            <Link href="/contact" className="text-flare underline-offset-4 hover:underline">
              let us know
            </Link>
            .
          </Text>
          <SignOut path={path} className="mt-4" />
        </>
      ) : (
        <>
          <Heading>Share what you know</Heading>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.9rem] text-muted">
            {mode === "live" ? (
              <>
                <span>
                  Answering as <span className="text-body">{viewer.name || viewer.email}</span>
                </span>
                <RoleBadge role={role} />
                <SignOut path={path} />
              </>
            ) : (
              <span>Preview mode: pick who you’re answering as.</span>
            )}
          </div>

          {result.status === "posted" && (
            <p role="status" className="mt-5 flex items-center gap-2.5 rounded-[12px] border border-flare/35 bg-lava/15 px-4 py-3 text-[0.95rem] text-fg">
              <CheckIcon className="text-flare" />
              {result.notified ? "Your answer is posted, and we’ve let the student know." : "Your answer is posted."}
            </p>
          )}

          <AnswerFields key={result.posted} action={action} pending={pending} result={result} questionId={questionId} preview={mode === "preview"} />
        </>
      )}
    </div>
  );
}

function AnswerFields({
  action,
  pending,
  result,
  questionId,
  preview,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  result: AnswerFormState;
  questionId: string;
  preview: boolean;
}) {
  const [length, setLength] = useState(result.body?.length ?? 0);
  return (
    <form action={action} noValidate className="mt-6 grid gap-5">
      <input type="hidden" name="questionId" value={questionId} />
      {preview && (
        <fieldset>
          <legend className="sr-only">Answer as</legend>
          <div className="flex flex-wrap gap-2">
            <RadioPill name="role" value="faculty" defaultChecked>
              Faculty
            </RadioPill>
            <RadioPill name="role" value="senior">
              Senior
            </RadioPill>
          </div>
        </fieldset>
      )}
      <Field label="Answer" hint={<Counter length={length} max={limits.answer.max} />} error={result.status === "error" ? result.error : undefined}>
        {(props) => (
          <textarea
            {...props}
            name="body"
            rows={6}
            maxLength={limits.answer.max}
            placeholder="Explain the idea, point to a resource, or suggest a next step."
            defaultValue={result.status === "error" ? result.body : undefined}
            onInput={(e) => setLength(e.currentTarget.value.length)}
            className={cn(inputClass, "min-h-40 resize-y py-3.5 leading-relaxed")}
          />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.85rem] text-muted">The student gets an email with your answer.</p>
        <button type="submit" disabled={pending} className="btn-pill btn-primary disabled:opacity-70">
          {pending ? "Posting…" : "Post answer"}
        </button>
      </div>
    </form>
  );
}

function SignOut({ path, className }: { path: string; className?: string }) {
  return (
    <form action={signOut} className={className}>
      <input type="hidden" name="next" value={path} />
      <button type="submit" className="text-[0.9rem] text-flare underline-offset-4 hover:underline">
        Sign out
      </button>
    </form>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-2.5 font-heading text-[clamp(1.3rem,1.7vw,1.6rem)] leading-[1.15]">{children}</h2>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-body">{children}</p>;
}

