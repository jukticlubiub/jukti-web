"use client";

import { motion } from "motion/react";
import { useActionState, useState } from "react";
import { Counter, Field, FieldError, FormError, inputClass, RadioPill } from "@/components/helpline/fields";
import { ArrowIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { shareMemory } from "@/lib/memories/actions";
import { memoryLimits as limits, type MemoryFormState, memoryRelations } from "@/lib/memories/types";

/** "Share a memory" of Dr. Sabbir. Memories go up once the club has read them. */
export function MemoryForm() {
  const [round, setRound] = useState(0);
  return <Form key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function Form({ onAgain }: { onAgain: () => void }) {
  const [state, action, pending] = useActionState(shareMemory, { status: "idle" } as MemoryFormState);
  const [length, setLength] = useState(state.values?.message?.length ?? 0);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col items-center py-10 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-14 place-items-center rounded-full bg-lava text-white shadow-[0_0_40px_rgb(245_124_72/0.6)]"
        >
          <CheckIcon className="size-6" />
        </motion.span>
        <h3 className="mt-6 text-[1.5rem] font-light text-fg">Thank you for sharing</h3>
        <p className="mt-3 max-w-md leading-relaxed text-body/85">
          {state.preview
            ? "Preview mode: your memory is on the page now. On the live site, memories appear once the club has read them."
            : "Your memory will appear on this page once the club has read it."}
        </p>
        <button type="button" onClick={onAgain} className="btn-pill btn-ghost mt-7 text-[0.85rem]">
          Share another memory
        </button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-5">
      {/* Honeypot: hidden from people (and screen readers), filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name}>
          {(props) => (
            <input {...props} name="name" autoComplete="name" maxLength={limits.name} defaultValue={values.name} className={cn(inputClass, "h-12")} />
          )}
        </Field>
        <Field label="Batch or department (optional)" error={errors.affiliation}>
          {(props) => (
            <input
              {...props}
              name="affiliation"
              maxLength={limits.affiliation}
              placeholder="e.g. CSE, 2012"
              defaultValue={values.affiliation}
              className={cn(inputClass, "h-12")}
            />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2.5 text-[0.85rem] text-muted">You knew him as his…</legend>
        <div className="flex flex-wrap gap-2">
          {memoryRelations.map((r) => (
            <RadioPill key={r.value} name="relation" value={r.value} defaultChecked={values.relation === r.value}>
              {r.label}
            </RadioPill>
          ))}
        </div>
        {errors.relation && <FieldError>{errors.relation}</FieldError>}
      </fieldset>

      <Field label="Your memory" hint={<Counter length={length} max={limits.message.max} />} error={errors.message}>
        {(props) => (
          <textarea
            {...props}
            name="message"
            rows={6}
            maxLength={limits.message.max}
            placeholder="A class, a conversation, something he said or did that stayed with you…"
            defaultValue={values.message}
            onInput={(e) => setLength(e.currentTarget.value.length)}
            className={cn(inputClass, "min-h-40 resize-y py-3.5 leading-relaxed")}
          />
        )}
      </Field>

      <Field
        label="Your email (optional, never shown)"
        hint={<span className="text-[0.8rem] text-muted">So we can reach you about photos</span>}
        error={errors.email}
      >
        {(props) => (
          <input {...props} name="email" type="email" autoComplete="email" defaultValue={values.email} className={cn(inputClass, "h-12")} />
        )}
      </Field>

      {state.error && <FormError>{state.error}</FormError>}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.88rem] text-muted">Memories appear once the club has read them.</p>
        <button type="submit" disabled={pending} className="btn-pill btn-primary disabled:opacity-70">
          {pending ? "Sharing…" : "Share memory"}
          {!pending && <ArrowIcon />}
        </button>
      </div>
    </form>
  );
}
