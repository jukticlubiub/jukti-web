"use client";

import { cn } from "@/lib/cn";
import { useNow } from "@/components/ui/useNow";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Starts in" before the event, "Ends in" while it's on, nothing once it's over.
 * Rendered only on the client (it depends on the visitor's clock); the server
 * sends an empty box of the same size.
 */
export function Countdown({ startsAt, endsAt, className }: { startsAt: string; endsAt: string; className?: string }) {
  const now = useNow();
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);

  if (now !== null && now >= end) return null;

  const before = now === null || now < start;
  let seconds = now === null ? 0 : Math.max(0, Math.floor(((before ? start : end) - now) / 1000));
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const units: [number, string][] = [
    [days, "Days"],
    [hours, "Hrs"],
    [minutes, "Min"],
    [seconds, "Sec"],
  ];
  const label = before ? "Starts in" : "Ends in";

  return (
    <div className={cn(now === null && "invisible", className)}>
      <p className="text-[0.8rem] font-medium tracking-[0.14em] text-muted uppercase">{label}</p>
      <div
        role="timer"
        aria-label={`${label} ${days} days, ${hours} hours and ${minutes} minutes`}
        className="mt-2.5 flex items-stretch gap-2"
      >
        {units.map(([value, unit], i) => (
          <div key={unit} className="flex items-center gap-2">
            <div className="flex w-[4.4rem] flex-col items-center rounded-[14px] border border-glass-border bg-white/[0.035] py-2.5 sm:w-[4.9rem]">
              <span aria-hidden className="font-display text-[1.45rem] leading-none text-fg tabular-nums sm:text-[1.7rem]">
                {pad(value)}
              </span>
              <span aria-hidden className="mt-1.5 text-[0.68rem] tracking-[0.14em] text-muted uppercase">
                {unit}
              </span>
            </div>
            {i < units.length - 1 && (
              <span aria-hidden className="hidden font-display text-lg text-flare/60 sm:block">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
