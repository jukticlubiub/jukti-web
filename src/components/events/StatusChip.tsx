"use client";

import { chipClass } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { eventStatus } from "@/lib/events/time";
import type { EventStatus } from "@/lib/events/types";
import { useNow } from "@/components/ui/useNow";

const labels: Record<EventStatus, string> = {
  ongoing: "Happening now",
  upcoming: "Upcoming",
  past: "Ended",
};

export function StatusChip({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={cn(
        chipClass,
        status === "ongoing" && "border-flare/60 bg-lava/20 text-fg shadow-[0_0_24px_-6px_rgb(245_124_72/0.7)]",
        status === "upcoming" && "border-glass-border bg-glass text-fg",
        status === "past" && "border-glass-border bg-transparent text-muted",
        className,
      )}
    >
      {status === "ongoing" && (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-flare opacity-75" />
          <span className="relative size-2 rounded-full bg-flare" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}

/** Status worked out from the visitor's clock, for pages that are prerendered. */
export function LiveStatusChip({ startsAt, endsAt, className }: { startsAt: string; endsAt: string; className?: string }) {
  const now = useNow();
  if (now === null) return <span aria-hidden className={cn(chipClass, "invisible border-transparent", className)}>Upcoming</span>;
  return <StatusChip status={eventStatus({ startsAt, endsAt }, now)} className={className} />;
}
