import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/cn";
import { calendarFilePath, eventPath, googleCalendarUrl } from "@/lib/events/calendar";
import { categoryLabels, type EventStatus, type JuktiEvent } from "@/lib/events/types";
import { site } from "@/lib/site";
import { AddToCalendar } from "./AddToCalendar";
import { Countdown } from "./Countdown";
import { EventCover } from "./EventCover";
import { EventMeta } from "./EventMeta";
import { ArrowIcon } from "@/components/ui/icons";
import { SeatsMeter } from "./SeatsMeter";
import { Chip } from "@/components/ui/Chip";
import { StatusChip } from "./StatusChip";

/**
 * The event on right now, or the next one, as a large glass card rising out of an
 * eclipse, like the homepage hero.
 */
export function FeaturedEvent({ event, status }: { event: JuktiEvent; status: EventStatus }) {
  const href = eventPath(event.slug);
  // Taking RSVPs right now (on, and not closed early by the organisers).
  const rsvpOpen = event.rsvp.enabled && !event.rsvp.closed;
  // Large screens show the square cover when there is one, so the frame turns square to match it.
  const hasSquare = Boolean(event.cover?.squareUrl && event.cover.squareUrl !== event.cover.url);

  return (
    <section aria-labelledby="featured-title" className="relative">
      <EclipseHorizon />

      <GlassCard
        tilt={false}
        className="relative grid overflow-visible bg-[rgb(18_10_7/0.55)] p-2.5 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] sm:p-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      >
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            "relative block overflow-hidden rounded-[14px]",
            hasSquare ? "lg:aspect-square lg:self-center" : "aspect-[16/9] lg:aspect-auto lg:min-h-[34rem]",
          )}
        >
          {hasSquare ? (
            // Smaller screens: the wide cover at its own shape. Large: the square cover filling the square frame.
            <EventCover
              event={event}
              natural
              squareOnLarge
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="lg:absolute lg:inset-0 lg:h-full lg:object-cover"
            />
          ) : (
            <EventCover event={event} animated priority contain sizes="(max-width: 1024px) 100vw, 45vw" />
          )}
        </Link>

        <div className="flex flex-col gap-6 px-3 pt-6 pb-4 sm:px-5 lg:justify-center lg:gap-7 lg:py-10 lg:pr-[clamp(1.5rem,3vw,3.5rem)] lg:pl-[clamp(1.75rem,3.2vw,3.75rem)]">
          <div className="flex flex-wrap gap-2.5">
            <StatusChip status={status} />
            <Chip>{categoryLabels[event.category]}</Chip>
          </div>

          <div>
            <h2 id="featured-title" className="font-heading text-[clamp(1.55rem,2.7vw,2.9rem)] leading-[1.08]">
              <Link href={href} className="transition-colors duration-300 hover:text-flare">
                {event.title}
              </Link>
            </h2>
            <p className="mt-4 max-w-xl text-[clamp(1.02rem,1.2vw,1.2rem)] leading-relaxed text-body">{event.summary}</p>
          </div>

          <EventMeta event={event} />

          <Countdown startsAt={event.startsAt} endsAt={event.endsAt} />

          {event.rsvp.enabled && <SeatsMeter seats={event.rsvp} className="max-w-md" />}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={rsvpOpen ? `${href}#rsvp` : href} className="btn-pill btn-primary">
              {rsvpOpen ? "RSVP now" : "View event"}
              <ArrowIcon />
            </Link>
            {rsvpOpen && (
              <Link href={href} className="btn-pill btn-ghost">
                Details
              </Link>
            )}
            <AddToCalendar
              googleUrl={googleCalendarUrl(event, `${site.url}${href}`)}
              icsPath={calendarFilePath(event.slug)}
            />
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

/** The homepage's eclipse, drawn in CSS: a planet whose lava rim glows behind the card. */
function EclipseHorizon() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[-50vw] top-[-12%] bottom-[-40%] overflow-hidden">
      <span className="lava-blob [--c:rgb(102_42_17/1)] [--d:31s] [--s:48vw] [--x:28%] [--y:52%]" />
      <span className="lava-blob [--c:rgb(200_74_26/0.75)] [--d:24s] [--delay:-8s] [--s:34vw] [--x:44%] [--y:47%]" />
      <span className="lava-blob [--c:rgb(245_124_72/0.5)] [--d:19s] [--delay:-3s] [--s:26vw] [--x:58%] [--y:46%]" />
      <span className="lava-blob [--c:rgb(200_74_26/0.7)] [--d:29s] [--delay:-17s] [--s:40vw] [--x:72%] [--y:50%]" />
      <div className="absolute top-[50%] left-1/2 aspect-square w-[max(190vw,120rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_0%,#160803_0%,#0b0401_12%,#000_40%)] shadow-[inset_0_2px_0_rgb(255_205_170/0.55),0_0_0_1px_rgb(245_124_72/0.35),0_-10px_40px_rgb(245_124_72/0.45),0_-40px_160px_30px_rgb(200_74_26/0.35)]" />
    </div>
  );
}
