"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Field, FormError, inputClass } from "@/components/helpline/fields";
import type { ActionState } from "@/lib/admin/form";
import { cn } from "@/lib/cn";
import { bkashNumber, bloodGroups } from "@/lib/members/options";

/**
 * A form that keeps what was typed when the server finds a problem (a plain form action
 * would reset it), and moves focus to the first field that needs fixing.
 */
export function MemberForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (state: ActionState, pending: boolean) => React.ReactNode;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, { status: "idle" } as ActionState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const first = form.current?.querySelector<HTMLElement>("[aria-invalid=true]");
    (first ?? form.current?.querySelector<HTMLElement>("[role=alert]"))?.focus();
    (first ?? form.current?.querySelector<HTMLElement>("[role=alert]"))?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);

  return (
    <form
      ref={form}
      noValidate
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {children(state, pending)}
    </form>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "error" && state.message) return <FormError className="outline-none">{state.message}</FormError>;
  if (state.status === "ok" && state.message)
    return (
      <p role="status" className="text-[0.95rem] text-emerald-300">
        {state.message}
      </p>
    );
  return null;
}

/** A group of fields under a small heading. */
export function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-glass-border pt-7 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full">
        <span className="block text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">{title}</span>
        {hint && <span className="mt-1.5 block text-[0.92rem] leading-relaxed text-body/85">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

type TextProps = {
  label: React.ReactNode;
  name: string;
  error?: string;
  defaultValue?: string | null;
  hint?: React.ReactNode;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue" | "className">;

export function TextInput({ label, name, error, defaultValue, hint, className, ...rest }: TextProps) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(control) => (
        <input
          {...control}
          {...rest}
          name={name}
          defaultValue={defaultValue ?? ""}
          className={cn(inputClass, "h-12", rest.readOnly && "cursor-default border-dashed text-body hover:bg-white/[0.04]")}
        />
      )}
    </Field>
  );
}

export function BloodGroupSelect({ defaultValue, error }: { defaultValue?: string | null; error?: string }) {
  return (
    <Field label="Blood group" hint={<span className="text-[0.75rem] text-muted">Optional</span>} error={error}>
      {(control) => (
        <select {...control} name="blood_group" defaultValue={defaultValue ?? ""} className={cn(inputClass, "h-12 appearance-none")}>
          <option value="">Not saying</option>
          {bloodGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Choice pills (checkboxes) plus an "Other" box; values outside the options go in the box. */
export function Choices({
  label,
  hint,
  name,
  options,
  defaultValues = [],
}: {
  label: string;
  hint?: string;
  name: string;
  options: readonly string[];
  defaultValues?: string[];
}) {
  const others = defaultValues.filter((v) => !options.includes(v));
  return (
    <div>
      <p className="text-[0.85rem] text-muted">{label}</p>
      {hint && <p className="mt-1 text-[0.82rem] text-muted/80">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-[0.88rem] text-body transition-[background-color,border-color,color] duration-200 select-none hover:border-flare/50 hover:text-fg has-checked:border-flare has-checked:bg-lava has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-flare"
          >
            <input type="checkbox" name={name} value={option} defaultChecked={defaultValues.includes(option)} className="sr-only" />
            {option}
          </label>
        ))}
      </div>
      <input
        name={`${name}_other`}
        defaultValue={others.join(", ")}
        aria-label={`${label}: other`}
        placeholder="Other (type it here)"
        maxLength={80}
        className={cn(inputClass, "mt-3 h-11 text-[0.92rem]")}
      />
    </div>
  );
}

/**
 * How they paid, as the registration app asks: bKash (sender number, optional transaction
 * ID) or cash to an executive; either way the executive gives them a code to enter.
 */
export function PaymentFields({
  iubId,
  errors,
  defaults,
}: {
  iubId: string;
  errors: Record<string, string>;
  defaults?: { method?: string | null; sender?: string | null; txn?: string | null };
}) {
  const [method, setMethod] = useState(defaults?.method === "Cash" ? "Cash" : "Bkash");
  return (
    <>
      <div role="radiogroup" aria-label="Payment" className="flex flex-wrap gap-2">
        {(["Bkash", "Cash"] as const).map((m) => (
          <label
            key={m}
            className="relative inline-flex h-11 cursor-pointer items-center rounded-full border border-glass-border bg-glass px-5 text-[0.92rem] text-body transition-[background-color,border-color,color] duration-200 select-none hover:border-flare/50 hover:text-fg has-checked:border-flare has-checked:bg-lava has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-flare"
          >
            <input type="radio" name="payment_method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
            {m === "Bkash" ? "bKash" : "Cash to an executive"}
          </label>
        ))}
      </div>

      {method === "Bkash" ? (
        <>
          <div className="rounded-[14px] border border-flare/30 bg-lava/10 p-4 text-[0.95rem] leading-relaxed text-body">
            Send the registration fee to <strong className="font-semibold text-fg tabular-nums">{bkashNumber}</strong> (bKash, personal), with
            your IUB ID <strong className="font-semibold text-fg tabular-nums">{iubId}</strong> as the reference. An executive will then give you
            a code to enter below.
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="bKash number you paid from" name="bkash_sender_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" defaultValue={defaults?.sender} error={errors.bkash_sender_number} />
            <TextInput
              label="Transaction ID"
              name="bkash_transaction_id"
              hint={<span className="text-[0.75rem] text-muted">Optional</span>}
              placeholder="e.g. 9A7B6C5D4E"
              autoCapitalize="characters"
              defaultValue={defaults?.txn}
              error={errors.bkash_transaction_id}
            />
          </div>
        </>
      ) : (
        <p className="rounded-[14px] border border-glass-border bg-white/[0.03] p-4 text-[0.95rem] leading-relaxed text-body">
          Hand the fee to a JUKTI executive. They’ll give you a code to enter below.
        </p>
      )}

      <TextInput
        label="Executive code"
        name="executive_id"
        type="password"
        autoComplete="off"
        placeholder="Given to you by an executive after you pay"
        error={errors.executive_id}
      />
    </>
  );
}
