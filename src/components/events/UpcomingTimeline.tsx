import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import { eventPath } from "@/lib/events/calendar";
import { dateParts, formatTimeRange } from "@/lib/events/time";
import { categoryLabels, type JuktiEvent } from "@/lib/events/types";
import { DateTile } from "./DateTile";
import { EventCover } from "./EventCover";
import { ArrowIcon, ClockIcon, PinIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";

function rsvpNote(event: JuktiEvent) {
  const { enabled, capacity, registered } = event.rsvp;
  if (!enabled) return "Open to all, no RSVP needed";
  if (event.rsvp.closed) return "Registration closed";
  if (capacity === null) return "RSVP open";
  const left = capacity - registered;
  if (left <= 0) return "Fully booked, waitlist open";
  return `${left} ${left === 1 ? "seat" : "seats"} left`;
}

/** What's coming after the featured event, soonest first, strung along a glowing timeline. */
export function UpcomingTimeline({ events }: { events: JuktiEvent[] }) {
  return (
    <section aria-labelledby="upcoming-title" className="relative">
      <SectionHeading id="upcoming-title" title="Upcoming" count={events.length} />

      <ol className="relative mt-[clamp(2.25rem,3.5vw,4rem)] grid gap-[clamp(1.25rem,2vw,2rem)] before:absolute before:top-2 before:bottom-2 before:left-[0.55rem] before:w-px before:bg-[linear-gradient(to_bottom,rgb(245_124_72/0.8),rgb(245_124_72/0.25)_70%,transparent)] md:before:left-[calc(8.5rem+1.25rem)]">
        {events.map((event, i) => {
          const { month, day } = dateParts(event.startsAt);
          return (
            <Reveal as="li" key={event.id} delay={Math.min(i, 4) * 0.08} className="relative grid gap-3 pl-9 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-[2.5rem] md:pl-0">
              {/* The node on the timeline. */}
              <span
                aria-hidden
                className="absolute top-8 left-[0.55rem] size-3 -translate-x-1/2 rounded-full bg-flare shadow-[0_0_0_4px_rgb(0_0_0),0_0_18px_4px_rgb(245_124_72/0.7)] md:top-1/2 md:left-[calc(8.5rem+1.25rem)] md:-translate-y-1/2"
              />
              <DateTile iso={event.startsAt} className="hidden self-center text-[1rem] md:flex" />
              <p className="text-[0.8rem] font-medium tracking-[0.16em] text-flare md:hidden">
                {month} {Number(day)}
              </p>

              <GlassCard className="group md:ml-5">
                <Link href={eventPath(event.slug)} className="grid gap-5 rounded-[inherit] p-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-center sm:gap-7 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto]">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[14px]">
                    <EventCover
                      event={event}
                      sizes="(max-width: 640px) 100vw, 18rem"
                      className="transition-[scale] duration-700 ease-reveal group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="px-2 pb-2 sm:px-0 sm:pb-0">
                    <p className="text-[0.78rem] font-medium tracking-[0.12em] uppercase">
                      <span className="text-flare">{categoryLabels[event.category]}</span>
                      <span className="text-muted"> · {rsvpNote(event)}</span>
                    </p>
                    <h3 className="mt-3 font-heading text-[clamp(1.1rem,1.6vw,1.6rem)] leading-[1.2] tracking-[-0.01em] transition-colors duration-300 group-hover:text-flare">
                      {event.title}
                    </h3>
                    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.95rem] text-body">
                      <span className="inline-flex items-center gap-2">
                        <ClockIcon className="text-flare" />
                        {formatTimeRange(event)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <PinIcon className="text-flare" />
                        {event.venue}
                      </span>
                    </p>
                    <p className="mt-3 line-clamp-2 max-w-2xl text-body/80 max-lg:hidden">{event.summary}</p>
                  </div>
                  <span
                    aria-hidden
                    className="mr-4 hidden size-12 items-center justify-center rounded-full border border-glass-border text-fg transition-[background-color,border-color,translate] duration-300 group-hover:translate-x-1 group-hover:border-flare group-hover:bg-lava lg:flex"
                  >
                    <ArrowIcon />
                  </span>
                </Link>
              </GlassCard>
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}
