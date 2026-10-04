import { cn } from "@/lib/cn";
import type { EventSeats } from "@/lib/events/types";

/** Seats taken out of the capacity, as a glowing bar. Events without a limit show a head count. */
export function SeatsMeter({
  seats,
  inviteToWaitlist = true,
  className,
}: {
  seats: EventSeats;
  /** When full, suggest joining the waitlist. Off for someone who's already on it. */
  inviteToWaitlist?: boolean;
  className?: string;
}) {
  const { capacity, registered, waitlisted } = seats;

  if (capacity === null) {
    return (
      <p className={cn("text-body", className)}>
        <span className="font-medium text-fg">{registered}</span> {registered === 1 ? "person has" : "people have"} RSVP’d
      </p>
    );
  }

  const taken = Math.min(registered, capacity);
  const left = capacity - taken;
  const full = left === 0;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4 text-[0.95rem]">
        <span className={cn("font-medium", full ? "text-flare" : "text-fg")}>
          {full ? "Fully booked" : `${left} ${left === 1 ? "seat" : "seats"} left`}
        </span>
        <span className="text-muted tabular-nums">
          {taken} / {capacity}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Seats taken"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={taken}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#c84a1a,#f57c48)] shadow-[0_0_14px_rgb(245_124_72/0.7)]"
          style={{ width: `${Math.max(2, (taken / capacity) * 100)}%` }}
        />
      </div>
      {full && (waitlisted > 0 || inviteToWaitlist) && (
        <p className="mt-2.5 text-[0.9rem] text-muted">
          {waitlisted > 0 ? `${waitlisted} on the waitlist.` : ""}
          {inviteToWaitlist ? `${waitlisted > 0 ? " " : ""}Join the waitlist to get the next free seat.` : ""}
        </p>
      )}
    </div>
  );
}
