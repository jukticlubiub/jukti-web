"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-[12px] border border-glass-border bg-white/[0.04] px-4 text-base text-fg transition-[border-color,background-color] duration-200 placeholder:text-muted/70 hover:bg-white/[0.06] focus:border-flare focus:outline-none aria-invalid:border-[#ff8f7a]/70";

type ControlProps = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

/** A label, the control (given its id and error wiring), an optional hint, and the error. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.85rem] text-muted">
        {label}
        {hint}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-[0.85rem] text-[#ff8f7a]">
      {children}
    </p>
  );
}

export function FormError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn("rounded-[12px] border border-[#ff8f7a]/40 bg-[#ff8f7a]/10 px-4 py-3 text-[0.95rem] text-[#ffb4a6]", className)}>
      {children}
    </p>
  );
}

/** "120 / 5,000", turning orange near the limit. */
export function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span aria-hidden className={cn("text-[0.8rem] tabular-nums", length > max * 0.9 ? "text-flare" : "text-muted")}>
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

/** A choice drawn as a pill (a styled radio button). */
export function RadioPill({
  name,
  value,
  defaultChecked,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="relative inline-flex h-10 cursor-pointer items-center rounded-full border border-glass-border bg-glass px-4 text-[0.9rem] text-body transition-[background-color,border-color,color] duration-200 select-none hover:border-flare/50 hover:text-fg has-checked:border-flare has-checked:bg-lava has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-flare">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      {children}
    </label>
  );
}
