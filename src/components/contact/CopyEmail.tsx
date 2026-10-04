"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

/**
 * Copies an email address, for people whose mail app isn't set up in the browser.
 * `iconOnly` draws a small round button (the address is its accessible name).
 */
export function CopyEmail({ email, iconOnly = false, className }: { email: string; iconOnly?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
        } catch {
          window.prompt("Copy this address:", email);
        }
      }}
      aria-label={iconOnly ? `Copy ${email}` : undefined}
      title={iconOnly ? "Copy email address" : undefined}
      className={cn(
        iconOnly
          ? "grid size-9 shrink-0 place-items-center rounded-full border border-glass-border bg-glass text-body transition-colors hover:border-flare/50 hover:text-fg"
          : "btn-pill btn-ghost text-[0.8rem]",
        className,
      )}
    >
      {copied ? <CheckIcon className="text-flare" /> : <CopyIcon />}
      {!iconOnly && (copied ? "Copied" : "Copy")}
      <span role="status" className="sr-only">
        {copied ? "Email address copied" : ""}
      </span>
    </button>
  );
}
