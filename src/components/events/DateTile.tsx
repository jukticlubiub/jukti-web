import { cn } from "@/lib/cn";
import { dateParts } from "@/lib/events/time";

/** A calendar-page date: month, day, weekday. */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const { day, month, weekday } = dateParts(iso);
  return (
    <div className={cn("flex flex-col items-center leading-none", className)}>
      <span className="text-[0.78rem] font-medium tracking-[0.22em] text-flare">{month}</span>
      <span className="mt-2 font-display text-[2.5em] tracking-[-0.03em] text-fg">{day}</span>
      <span className="mt-2 text-[0.72rem] tracking-[0.18em] text-muted uppercase">{weekday}</span>
    </div>
  );
}
