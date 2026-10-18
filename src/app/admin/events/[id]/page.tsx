import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventForm } from "@/components/admin/events/EventForm";
import { PastEventForm } from "@/components/admin/events/PastEventForm";
import { GalleryManager } from "@/components/admin/events/GalleryManager";
import { RecapForm } from "@/components/admin/events/RecapForm";
import { Attendance } from "@/components/admin/events/Attendance";
import { CheckInScanner } from "@/components/admin/events/CheckInScanner";
import { RsvpTable } from "@/components/admin/events/RsvpTable";
import { PageHeader, PageSkeleton, Panel, Pill, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { requestTime } from "@/lib/events/now";
import { getAdminEvent, getEventPhotosForAdmin, getRegistrations, getStationScans, getStations } from "@/lib/admin/data/events";
import type { Admin } from "@/lib/admin/access";
import { canAccess, canOpenEvents } from "@/lib/admin/roles";
import { cn } from "@/lib/cn";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Event" };

export default function EventAdminPage(props: PageProps<"/admin/events/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EventAdmin {...props} />
    </Suspense>
  );
}

async function EventAdmin({ params, searchParams }: PageProps<"/admin/events/[id]">) {
  const admin = await requireArea(canOpenEvents);
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const event = await getAdminEvent(admin, id);
  if (!event) notFound();

  const manager = canAccess(admin.roles, "events");
  const pr = admin.roles.includes("pr_editor") || admin.roles.includes("master_admin");
  const isOver = Date.parse(event.endsAt) < (await requestTime());
  const tabs = [
    // PR Editors can fix the details of past events (they document them).
    ...(!manager && pr && isOver ? [{ value: "past", label: "Details" }] : []),
    ...(manager
      ? [
          { value: "details", label: "Details" },
          { value: "rsvps", label: `RSVPs (${event.rsvp.registered + event.rsvp.waitlisted})` },
          ...(event.rsvp.enabled ? [{ value: "checkin", label: "Check-in & food" }] : []),
        ]
      : []),
    ...(pr ? [{ value: "recap", label: "Recap & gallery" }] : []),
  ];
  const tab = tabs.some((t) => t.value === rawTab) ? (rawTab as string) : tabs[0].value;
  const live = admin.mode === "live";

  return (
    <>
      <PageHeader
        title={event.title}
        back={{ href: "/admin/events", label: "Events" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatWhen(event.startsAt)} · {event.venue || "No venue"}
            {event.published ? <Pill tone="green">Published</Pill> : <Pill tone="orange">Draft</Pill>}
          </span>
        }
      >
        {event.published && (
          <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
            View on site ↗
          </a>
        )}
      </PageHeader>

      <nav aria-label="Event sections" className="mb-6 flex flex-wrap gap-1 border-b border-glass-border">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/events/${event.id}?tab=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-[0.92rem] transition-colors", tab === t.value ? "border-flare text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "details" && (
        <Panel>
          <EventForm event={event} live={live} />
        </Panel>
      )}
      {tab === "past" && (
        <Panel>
          <PastEventForm event={event} live={live} />
        </Panel>
      )}
      {tab === "rsvps" && (
        <Panel>
          {event.rsvp.enabled || event.rsvp.registered > 0 ? (
            <RsvpTable registrations={await getRegistrations(admin, event.id)} questions={event.rsvp.questions} csvHref={`/admin/events/${event.id}/rsvps.csv`} />
          ) : (
            <p className="text-[0.92rem] text-muted">RSVPs are off for this event. Turn them on in Details.</p>
          )}
          {!live && <p className="mt-4 text-[0.85rem] text-muted">Preview mode: the people who RSVP’d appear here once Supabase is connected.</p>}
        </Panel>
      )}
      {tab === "checkin" && <CheckIn admin={admin} eventId={event.id} live={live} />}
      {tab === "recap" && (
        <div className="grid gap-6">
          {Date.parse(event.endsAt) > (await requestTime()) && (
            <p className="rounded-[14px] border border-sky-400/25 bg-sky-400/[0.06] px-4 py-3 text-[0.9rem] text-sky-100">
              This event hasn’t happened yet. The recap and gallery appear on the site once it’s over.
            </p>
          )}
          <Panel title="Recap">
            <RecapForm eventId={event.id} recap={event.recap} />
          </Panel>
          <Panel title="Photo gallery" description="Photos appear on the event page in this order.">
            <GalleryManager eventId={event.id} photos={await getEventPhotosForAdmin(admin, event)} live={live} />
          </Panel>
        </div>
      )}
    </>
  );
}

/** Event day: scan at the entry and at stations (Lunch…), and watch who's in and who's been served. */
async function CheckIn({ admin, eventId, live }: { admin: Admin; eventId: string; live: boolean }) {
  const [registrations, stations] = await Promise.all([getRegistrations(admin, eventId), getStations(admin, eventId)]);
  const scans = await getStationScans(admin, stations);
  return (
    <div className="grid gap-6">
      <Panel
        title="Scan"
        description="Pick where you are, then scan the QR code on a member’s card (Account → Member card) or type their member number. Green: let them in / serve them. Red: they’ve already had it."
      >
        <CheckInScanner eventId={eventId} stations={stations} />
        {!live && <p className="mt-4 text-[0.85rem] text-muted">Preview mode: scans are saved only once Supabase is connected.</p>}
      </Panel>
      <Panel title="Who’s here">
        <Attendance eventId={eventId} registrations={registrations} stations={stations} scans={Object.fromEntries(scans)} />
      </Panel>
    </div>
  );
}

