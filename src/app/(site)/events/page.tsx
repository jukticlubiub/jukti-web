import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { FeaturedEvent } from "@/components/events/FeaturedEvent";
import { PastEvents, type PastEventItem } from "@/components/events/PastEvents";
import { EventsBoardSkeleton } from "@/components/events/skeletons";
import { UpcomingTimeline } from "@/components/events/UpcomingTimeline";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { requestTime } from "@/lib/events/now";
import { getEvents } from "@/lib/events/queries";
import { eventStatus, eventYear, formatDateRange, groupEvents } from "@/lib/events/time";
import { joinLink } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Our Events",
  description:
    "Workshops, programming contests, hackathons and meetups by JUKTI, the Club of CSE at IUB. RSVP for what's next and relive past events.",
  path: "/events",
});

export default function EventsPage() {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      <section aria-labelledby="events-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
        <h1 id="events-title" className="font-heading text-[clamp(2.1rem,5.87vw,7.4rem)]">
          <MaskReveal>
            OUR <span className="text-flare">EVENTS</span>
          </MaskReveal>
        </h1>
        <Reveal
          as="p"
          delay={0.15}
          className="mt-[0.35em] text-[clamp(1.1rem,2.6vw,3rem)] leading-tight font-light tracking-[-0.03em] text-fg"
        >
          Learn, Compete and Build Together
        </Reveal>
      </section>

      <Suspense fallback={<EventsBoardSkeleton />}>
        <EventsBoard />
      </Suspense>
    </div>
  );
}

/** Sorted by the time of the visit, so it's worked out per request. The event data itself is cached. */
async function EventsBoard() {
  const events = await getEvents();
  const now = await requestTime();
  const { featured, next, past } = groupEvents(events, now);

  const archive: PastEventItem[] = past.map((event) => ({
    slug: event.slug,
    title: event.title,
    summary: event.recap ?? event.summary,
    category: event.category,
    cover: event.cover,
    photoCount: event.photoCount,
    dateLabel: formatDateRange(event),
    year: eventYear(event.startsAt),
  }));

  return (
    <div className="relative mx-auto grid max-w-[92rem] gap-[clamp(5rem,9vw,10rem)] px-5 pt-[clamp(3rem,5vw,6rem)] lg:px-[clamp(2rem,4vw,5rem)]">
      {featured ? <FeaturedEvent event={featured} status={eventStatus(featured, now)} /> : <NothingScheduled />}
      {next.length > 0 && <UpcomingTimeline events={next} />}
      {archive.length > 0 && <PastEvents events={archive} />}
    </div>
  );
}

function NothingScheduled() {
  return (
    <div className="glass-card mx-auto max-w-3xl px-6 py-14 text-center sm:px-12">
      <h2 className="font-heading text-[clamp(1.4rem,2.4vw,2.2rem)]">Nothing scheduled yet</h2>
      <p className="mx-auto mt-4 max-w-xl text-lg text-body">
        New events are announced here first. Join JUKTI to hear about them before anyone else.
      </p>
      <Link href={joinLink.href} className="btn-pill btn-primary mt-8">
        {joinLink.label}
      </Link>
    </div>
  );
}
