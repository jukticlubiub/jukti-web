import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddToCalendar } from "@/components/events/AddToCalendar";
import { Countdown } from "@/components/events/Countdown";
import { EventCard } from "@/components/events/EventCard";
import { EventCover } from "@/components/events/EventCover";
import { EventGallery } from "@/components/events/EventGallery";
import { EventMeta } from "@/components/events/EventMeta";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { ArrowIcon, ArrowLeftIcon } from "@/components/ui/icons";
import { RsvpPanel } from "@/components/events/RsvpPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShareButton } from "@/components/ui/ShareButton";
import { EventDetailSkeleton, RsvpSkeleton } from "@/components/events/skeletons";
import { LiveStatusChip } from "@/components/events/StatusChip";
import { Chip } from "@/components/ui/Chip";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { calendarFilePath, eventPath, googleCalendarUrl } from "@/lib/events/calendar";
import { requestTime } from "@/lib/events/now";
import { getEvent, getEventPhotos, getEvents } from "@/lib/events/queries";
import { getRsvpState } from "@/lib/events/rsvp";
import { eventSummary, formatDateRange, groupEvents } from "@/lib/events/time";
import { defaultShareImage, pageMetadata } from "@/lib/seo";
import { categoryLabels, type JuktiEvent } from "@/lib/events/types";
import { site } from "@/lib/site";

// A slug that never matches, for builds with no events yet: Cache Components needs at
// least one param to validate the route. It renders the 404 page.
const NO_EVENTS = "__no-events__";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.length ? events.map((event) => ({ slug: event.slug })) : [{ slug: NO_EVENTS }];
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event not found" };
  return pageMetadata({
    title: event.title,
    description: eventSummary(event),
    path: eventPath(event.slug),
    image: event.cover ? { url: event.cover.url, alt: event.cover.alt } : undefined,
  });
}

export default function EventPage({ params, searchParams }: PageProps<"/events/[slug]">) {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const container = "relative mx-auto max-w-[92rem] px-5 lg:px-[clamp(2rem,4vw,5rem)]";

async function EventDetail({ params, searchParams }: Pick<PageProps<"/events/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const photos = event.photoCount > 0 ? await getEventPhotos(event.id) : [];
  const path = eventPath(slug);
  const googleUrl = googleCalendarUrl(event, `${site.url}${path}`);
  const icsPath = calendarFilePath(slug);
  const paragraphs = event.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(event, `${site.url}${path}`)).replace(/</g, "\\u003c") }}
      />

      <header className={`${container} grid gap-[clamp(2.5rem,4vw,5rem)] pt-[clamp(8rem,11vw,12rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center`}>
        <div>
          <Link href="/events" className="inline-flex items-center gap-2 text-[0.95rem] text-muted transition-colors hover:text-fg">
            <ArrowLeftIcon />
            All events
          </Link>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Chip>{categoryLabels[event.category]}</Chip>
            <LiveStatusChip startsAt={event.startsAt} endsAt={event.endsAt} />
          </div>
          <h1 className="mt-6 font-heading text-[clamp(1.9rem,3.7vw,4.2rem)] leading-[1.06]">
            <MaskReveal>{event.title}</MaskReveal>
          </h1>
          <Reveal as="p" immediate delay={0.25} className="mt-6 max-w-2xl text-[clamp(1.1rem,1.35vw,1.4rem)] leading-relaxed text-body">
            {event.summary}
          </Reveal>
          <Reveal immediate delay={0.35}>
            <EventMeta event={event} className="mt-8 text-[1.05rem]" />
          </Reveal>
          <Reveal immediate delay={0.45} className="mt-9 flex flex-wrap gap-3">
            {photos.length > 0 ? (
              <a href="#gallery" className="btn-pill btn-primary">
                See the photos
                <ArrowIcon />
              </a>
            ) : (
              event.rsvp.enabled && (
                <a href="#rsvp" className="btn-pill btn-primary">
                  RSVP
                  <ArrowIcon />
                </a>
              )
            )}
            <AddToCalendar googleUrl={googleUrl} icsPath={icsPath} />
            <ShareButton title={event.title} path={path} />
          </Reveal>
        </div>

        <Reveal immediate delay={0.2} className="relative">
          <div aria-hidden className="absolute -inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(200_74_26/0.4),transparent)]" />
          <div className="glass-card relative p-2.5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] max-lg:aspect-[16/11]">
              <EventCover event={event} animated priority sizes="(max-width: 1024px) 100vw, 40vw" />
              {/* The live countdown floats over the cover, so it can come and go without moving the page. */}
              <Countdown
                startsAt={event.startsAt}
                endsAt={event.endsAt}
                className="absolute inset-x-3 bottom-3 rounded-[16px] border border-white/10 bg-black/45 p-4 backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-5 [&_[role=timer]]:justify-between"
              />
            </div>
          </div>
        </Reveal>
      </header>

      <div className={`${container} mt-[clamp(4.5rem,8vw,9rem)] grid gap-[clamp(3rem,5vw,6rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,27rem)]`}>
        <div className="grid content-start gap-[clamp(3.5rem,5vw,5.5rem)]">
          <section aria-labelledby="about-title">
            <h2 id="about-title" className="font-heading text-[clamp(1.5rem,2.3vw,2.4rem)]">
              <MaskReveal>About this event</MaskReveal>
            </h2>
            <Reveal className="mt-7 max-w-3xl space-y-5 text-[clamp(1.05rem,1.2vw,1.22rem)] leading-[1.75] text-body">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          </section>

          {event.recap && (
            <Reveal as="div" className="glass-card max-w-3xl p-7 sm:p-9">
              <section aria-labelledby="recap-title">
                <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">Recap</p>
                <h2 id="recap-title" className="sr-only">
                  Recap
                </h2>
                <p className="mt-4 text-[clamp(1.1rem,1.35vw,1.35rem)] leading-relaxed font-light text-fg">{event.recap}</p>
              </section>
            </Reveal>
          )}

          {event.agenda.length > 0 && (
            <section aria-labelledby="schedule-title">
              <h2 id="schedule-title" className="font-heading text-[clamp(1.5rem,2.3vw,2.4rem)]">
                <MaskReveal>Schedule</MaskReveal>
              </h2>
              <ol className="relative mt-9 grid max-w-3xl gap-8 border-l border-flare/30 pl-8">
                {event.agenda.map((item, i) => (
                  <Reveal as="li" key={i} delay={Math.min(i, 6) * 0.06} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-1 -left-8 size-2.5 -translate-x-1/2 rounded-full bg-flare shadow-[0_0_0_4px_rgb(0_0_0),0_0_14px_2px_rgb(245_124_72/0.7)]"
                    />
                    <p className="text-[0.8rem] font-medium tracking-[0.12em] text-flare uppercase">{item.time}</p>
                    <p className="mt-2 text-[1.15rem] font-normal text-fg">{item.title}</p>
                    {item.detail && <p className="mt-1.5 text-body">{item.detail}</p>}
                  </Reveal>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside id="rsvp" aria-labelledby="rsvp-title" className="scroll-mt-28 self-start lg:sticky lg:top-28">
          <Suspense fallback={<RsvpSkeleton />}>
            <RsvpBlock
              event={event}
              hasPhotos={photos.length > 0}
              googleUrl={googleUrl}
              icsPath={icsPath}
              searchParams={searchParams}
            />
          </Suspense>
        </aside>
      </div>

      {photos.length > 0 && (
        <section id="gallery" aria-labelledby="gallery-title" className={`${container} mt-[clamp(5rem,9vw,10rem)] scroll-mt-28`}>
          <SectionHeading id="gallery-title" title="Gallery" count={photos.length} />
          <div className="mt-[clamp(2rem,3vw,3.25rem)]">
            <EventGallery photos={photos} category={event.category} title={event.title} />
          </div>
        </section>
      )}

      <Suspense fallback={null}>
        <MoreEvents currentId={event.id} />
      </Suspense>
    </>
  );
}

/** The visitor's RSVP: read from their session at request time, so it streams in after the page. */
async function RsvpBlock({
  event,
  hasPhotos,
  googleUrl,
  icsPath,
  searchParams,
}: {
  event: JuktiEvent;
  hasPhotos: boolean;
  googleUrl: string;
  icsPath: string;
  searchParams: PageProps<"/events/[slug]">["searchParams"];
}) {
  await connection();
  const [state, query] = await Promise.all([getRsvpState(event), searchParams]);
  return (
    <RsvpPanel
      event={{ id: event.id, slug: event.slug, title: event.title, startsAt: event.startsAt, hasPhotos, fee: event.fee ?? null }}
      initial={state}
      googleUrl={googleUrl}
      icsPath={icsPath}
      signInFailed={query.signin === "failed"}
    />
  );
}

/** What's coming next (or, when nothing is, the latest past events). */
async function MoreEvents({ currentId }: { currentId: string }) {
  const events = await getEvents();
  const { featured, next, past } = groupEvents(
    events.filter((event) => event.id !== currentId),
    await requestTime(),
  );
  const upcoming = (featured ? [featured, ...next] : next).slice(0, 3);
  const shown = upcoming.length ? upcoming : past.slice(0, 3);
  if (!shown.length) return null;

  return (
    <section aria-labelledby="more-title" className={`${container} mt-[clamp(5rem,9vw,10rem)]`}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="more-title" title={upcoming.length ? "Up Next" : "More Events"} />
        <Link href="/events" className="btn-pill btn-ghost text-[0.85rem]">
          All events
          <ArrowIcon />
        </Link>
      </div>
      <ul className="mt-[clamp(2rem,3vw,3.25rem)] grid gap-[clamp(1rem,1.6vw,1.75rem)] sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((event, i) => (
          <Reveal as="li" key={event.id} delay={i * 0.06}>
            <EventCard event={{ ...event, dateLabel: formatDateRange(event) }} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/** schema.org Event, so search engines can show the date and venue. */
function structuredData(event: JuktiEvent, url: string) {
  const online = event.venue.toLowerCase() === "online";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: eventSummary(event),
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: event.venue || site.campus.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: `${site.campus.address[0]}, ${site.campus.address[1].split(",")[0]}`,
            addressLocality: "Dhaka",
            postalCode: "1229",
            addressCountry: "BD",
          },
        },
    image: [event.cover?.url ?? `${site.url}${defaultShareImage.url}`],
    url,
    organizer: { "@type": "Organization", name: site.fullName, url: site.url, logo: `${site.url}/brand/jukti-logo-512.png` },
  };
}
