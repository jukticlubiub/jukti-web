import { cn } from "@/lib/cn";
import { formatDateRange, formatTimeRange } from "@/lib/events/time";
import type { JuktiEvent } from "@/lib/events/types";
import { CalendarIcon, ClockIcon, PinIcon } from "@/components/ui/icons";

/** Date, time and venue. Times are in Dhaka time. */
export function EventMeta({
  event,
  className,
}: {
  event: Pick<JuktiEvent, "startsAt" | "endsAt" | "venue">;
  className?: string;
}) {
  const rows = [
    { label: "Date", icon: CalendarIcon, value: formatDateRange(event) },
    { label: "Time", icon: ClockIcon, value: formatTimeRange(event) },
    { label: "Venue", icon: PinIcon, value: event.venue },
  ].filter((row) => row.value);

  return (
    <dl className={cn("grid gap-2.5 text-body", className)}>
      {rows.map(({ label, icon: Icon, value }) => (
        <div key={label} className="flex items-center gap-3">
          <dt className="flex items-center text-flare">
            <Icon />
            <span className="sr-only">{label}</span>
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
