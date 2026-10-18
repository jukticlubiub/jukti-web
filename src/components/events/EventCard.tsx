import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/cn";
import { eventPath } from "@/lib/events/calendar";
import { categoryLabels, type JuktiEvent } from "@/lib/events/types";
import { EventCover } from "./EventCover";
import { CameraIcon } from "@/components/ui/icons";

export type EventCardData = Pick<JuktiEvent, "slug" | "title" | "summary" | "category" | "cover" | "photoCount"> & {
  /** Formatted on the server, e.g. "Sat, 13 Sep 2026". */
  dateLabel: string;
};

/**
 * A past (or other) event as a glass card linking to its page. Covers are shown in
 * black and white, like the alumni portraits, and warm up on hover.
 */
export function EventCard({ event, className }: { event: EventCardData; className?: string }) {
  return (
    <GlassCard className={cn("group h-full overflow-hidden", className)}>
      <Link href={eventPath(event.slug)} className="flex h-full flex-col rounded-[inherit]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-[inherit]">
          <EventCover
            event={event}
            contain
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
            className="grayscale-[0.9] transition-[filter,scale] duration-700 ease-reveal group-hover:scale-[1.04] group-hover:grayscale-0"
          />
          {event.photoCount > 0 && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[0.8rem] text-fg backdrop-blur-md">
              <CameraIcon />
              {event.photoCount} photos
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
          <p className="text-[0.78rem] font-medium tracking-[0.12em] text-muted uppercase">
            <span className="text-flare">{categoryLabels[event.category]}</span>
            <span aria-hidden> · </span>
            {event.dateLabel}
          </p>
          <h3 className="font-heading text-[clamp(1.05rem,1.35vw,1.3rem)] leading-[1.25] tracking-[-0.01em] transition-colors duration-300 group-hover:text-flare">
            {event.title}
          </h3>
          <p className="line-clamp-2 text-[0.98rem] leading-relaxed text-body/85">{event.summary}</p>
        </div>
      </Link>
    </GlassCard>
  );
}
