"use client";

import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/admin/form";
import { Field, FormError, inputClass } from "@/components/helpline/fields";

export { Field, FormError, inputClass };

/**
 * A form for an admin server action: shows field errors, a saved message, and resets
 * after a successful "create" when `resetOnSave` is set.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  resetOnSave = false,
  className,
  footer,
  danger = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (state: ActionState) => React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  resetOnSave?: boolean;
  className?: string;
  footer?: React.ReactNode;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ActionState);
  const [shownSaved, setShownSaved] = useState(0);

  useEffect(() => {
    if (state.status !== "ok" || !state.saved) return;
    // Show the "saved" note briefly after each save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShownSaved(state.saved);
    const t = setTimeout(() => setShownSaved(0), 3500);
    return () => clearTimeout(t);
  }, [state.status, state.saved]);

  return (
    <form action={formAction} noValidate className={cn("grid gap-5", className)} key={resetOnSave ? state.saved ?? 0 : undefined}>
      {children(state)}
      {state.status === "error" && state.message && <FormError>{state.message}</FormError>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={cn("btn-pill text-[0.82rem] disabled:opacity-60", danger ? "btn-ghost text-[#ffb4a6]" : "btn-primary")}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {shownSaved > 0 && state.status === "ok" && (
          <p role="status" className="text-[0.9rem] text-emerald-300">
            {state.message ?? "Saved."}
          </p>
        )}
        {footer}
      </div>
    </form>
  );
}

/** A labelled text input wired to an action's field errors. */
export function TextField({
  label,
  name,
  state,
  defaultValue,
  hint,
  className,
  ...rest
}: {
  label: string;
  name: string;
  state: ActionState;
  defaultValue?: string | number | null;
  hint?: React.ReactNode;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  return (
    <Field label={label} hint={hint} error={state.fieldErrors?.[name]} className={className}>
      {(props) => <input {...props} {...rest} name={name} defaultValue={defaultValue ?? undefined} className={cn(inputClass, "h-11")} />}
    </Field>
  );
}

export function TextArea({
  label,
  name,
  state,
  defaultValue,
  rows = 5,
  hint,
  className,
  mono = false,
  ...rest
}: {
  label: string;
  name: string;
  state: ActionState;
  defaultValue?: string | null;
  rows?: number;
  hint?: React.ReactNode;
  className?: string;
  mono?: boolean;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "defaultValue">) {
  return (
    <Field label={label} hint={hint} error={state.fieldErrors?.[name]} className={className}>
      {(props) => (
        <textarea
          {...props}
          {...rest}
          name={name}
          rows={rows}
          defaultValue={defaultValue ?? undefined}
          className={cn(inputClass, "resize-y py-3 leading-relaxed", mono && "font-mono text-[0.9rem]")}
        />
      )}
    </Field>
  );
}

export function Select({
  label,
  name,
  state,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  state: ActionState;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Field label={label} error={state.fieldErrors?.[name]} className={className}>
      {(props) => (
        <select {...props} name={name} defaultValue={defaultValue} className={cn(inputClass, "h-11 appearance-none bg-[#141110]")}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-flare">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full border border-glass-border bg-white/10 transition-colors peer-checked:border-flare peer-checked:bg-lava after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className="text-[0.95rem] leading-snug">
        <span className="text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.82rem] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * A small button that runs an action (e.g. hide, approve, delete) after an optional
 * confirmation, passing `fields` as hidden inputs.
 */
export function ActionButton({
  action,
  fields,
  label,
  confirm,
  tone = "ghost",
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  confirm?: string;
  tone?: "ghost" | "primary" | "danger";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ActionState);
  const [asking, setAsking] = useState(false);
  const buttonClass = cn(
    "inline-flex h-8 items-center rounded-full border px-3 text-[0.8rem] whitespace-nowrap transition-colors disabled:opacity-60",
    tone === "primary" && "border-flare bg-lava text-white hover:brightness-110",
    tone === "ghost" && "border-glass-border text-body hover:border-flare/50 hover:text-fg",
    tone === "danger" && "border-[#ff8f7a]/40 text-[#ffb4a6] hover:bg-[#ff8f7a]/10",
    className,
  );

  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-2" onSubmit={() => setAsking(false)}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {confirm && !asking ? (
        <button type="button" onClick={() => setAsking(true)} className={buttonClass}>
          {label}
        </button>
      ) : (
        <>
          {confirm && <span className="text-[0.82rem] text-muted">{confirm}</span>}
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "…" : confirm ? "Yes" : label}
          </button>
          {confirm && (
            <button type="button" onClick={() => setAsking(false)} className="text-[0.8rem] text-muted hover:text-fg">
              Cancel
            </button>
          )}
        </>
      )}
      {state.status === "error" && state.message && (
        <span role="alert" className="text-[0.8rem] text-[#ffb4a6]">
          {state.message}
        </span>
      )}
    </form>
  );
}
