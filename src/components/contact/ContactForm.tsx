"use client";

import { motion } from "motion/react";
import { useActionState, useId, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { sendContactMessage } from "@/lib/contact/actions";
import { type ContactField, type ContactFormState, contactTopics, MESSAGE_MAX } from "@/lib/contact/topics";

const inputClass =
  "w-full rounded-[12px] border border-glass-border bg-white/[0.04] px-4 text-base text-fg transition-[border-color,background-color] duration-200 placeholder:text-muted/70 hover:bg-white/[0.06] focus:border-flare focus:outline-none aria-invalid:border-[#ff8f7a]/70";

/**
 * "Send a Message": the visitor writes here, and it arrives in the club's Gmail with
 * Reply-To set to them (see lib/contact/actions.ts). After sending, "Send another"
 * starts a fresh form.
 */
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <MessageForm key={round} onReset={() => setRound((r) => r + 1)} />;
}

function MessageForm({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState(sendContactMessage, { status: "idle" } as ContactFormState);
  const [length, setLength] = useState(0);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  if (state.status === "sent") return <Sent replyTo={state.replyTo} preview={state.preview} onReset={onReset} />;

  return (
    <form action={action} noValidate className="grid gap-6">
      {/* Honeypot: hidden from people (and screen readers), filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" name="name" error={errors.name}>
          {(props) => <input {...props} autoComplete="name" defaultValue={values.name} className={cn(inputClass, "h-12")} />}
        </Field>
        <Field label="Your email" name="email" error={errors.email}>
          {(props) => (
            <input {...props} type="email" autoComplete="email" defaultValue={values.email} className={cn(inputClass, "h-12")} />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2.5 text-[0.85rem] text-muted">What’s it about?</legend>
        <div className="flex flex-wrap gap-2">
          {contactTopics.map((topic) => (
            <label
              key={topic.value}
              className="relative inline-flex h-10 cursor-pointer items-center rounded-full border border-glass-border bg-glass px-4 text-[0.9rem] text-body transition-[background-color,border-color,color] duration-200 select-none hover:border-flare/50 hover:text-fg has-checked:border-flare has-checked:bg-lava has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-flare"
            >
              <input
                type="radio"
                name="topic"
                value={topic.value}
                defaultChecked={(values.topic ?? "general") === topic.value}
                className="sr-only"
              />
              {topic.label}
            </label>
          ))}
        </div>
        {errors.topic && <FieldError>{errors.topic}</FieldError>}
      </fieldset>

      <Field label="Message" name="message" error={errors.message}>
        {(props) => (
          <>
            <textarea
              {...props}
              rows={6}
              maxLength={MESSAGE_MAX}
              defaultValue={values.message}
              onInput={(e) => setLength(e.currentTarget.value.length)}
              placeholder="Hi JUKTI, …"
              className={cn(inputClass, "min-h-40 resize-y py-3.5 leading-relaxed")}
            />
            <p aria-hidden className={cn("mt-1.5 text-right text-[0.8rem] tabular-nums", length > MESSAGE_MAX * 0.9 ? "text-flare" : "text-muted")}>
              {length.toLocaleString("en-US")} / {MESSAGE_MAX.toLocaleString("en-US")}
            </p>
          </>
        )}
      </Field>

      {state.error && (
        <p role="alert" className="rounded-[12px] border border-[#ff8f7a]/40 bg-[#ff8f7a]/10 px-4 py-3 text-[0.95rem] text-[#ffb4a6]">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.88rem] text-muted">We’ll reply to the email you give us.</p>
        <button type="submit" disabled={pending} className="btn-pill btn-primary disabled:opacity-70">
          {pending ? "Sending…" : "Send message"}
          {!pending && <ArrowIcon />}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  name: ContactField;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: ContactField;
  error?: string;
  children: (props: FieldProps) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.85rem] text-muted">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-[0.85rem] text-[#ff8f7a]">
      {children}
    </p>
  );
}

function Sent({ replyTo, preview, onReset }: { replyTo?: string; preview?: boolean; onReset: () => void }) {
  return (
    <div role="status" className="flex min-h-[26rem] flex-col items-center justify-center py-8 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid size-16 place-items-center rounded-full bg-lava text-white shadow-[0_0_44px_rgb(245_124_72/0.7)]"
      >
        <CheckIcon className="size-7" />
      </motion.span>
      <h3 className="mt-7 font-heading text-[clamp(1.4rem,2vw,1.9rem)]">Message sent!</h3>
      <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed text-body">
        Thanks for writing to JUKTI. We’ll reply to <span className="text-fg">{replyTo}</span>.
      </p>
      {preview && (
        <p className="mt-4 max-w-md text-[0.85rem] text-muted">
          Preview mode: no email service is set up, so the message was printed in the terminal instead of sent. This note is only
          shown in development.
        </p>
      )}
      <button type="button" onClick={onReset} className="btn-pill btn-ghost mt-8 text-[0.85rem]">
        Send another message
      </button>
    </div>
  );
}
