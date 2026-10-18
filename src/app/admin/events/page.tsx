import Link from "next/link";
import { Suspense } from "react";
import { Cell, Empty, PageHeader, PageSkeleton, Pill, Row, Table, formatWhen } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { requestTime } from "@/lib/events/now";
import { listEvents } from "@/lib/admin/data/events";
import { canAccess, canOpenEvents } from "@/lib/admin/roles";
import { cn } from "@/lib/cn";
import { categoryLabels } from "@/lib/events/types";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Events" };

const views = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "drafts", label: "Drafts" },
  { value: "all", label: "All" },
] as const;

export default function EventsAdminPage({ searchParams }: PageProps<"/admin/events">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Events searchParams={searchParams} />
    </Suspense>
  );
}

async function Events({ searchParams }: Pick<PageProps<"/admin/events">, "searchParams">) {
  const admin = await requireArea(canOpenEvents);
  const [{ view: rawView }, events] = await Promise.all([searchParams, listEvents(admin)]);
  const manager = canAccess(admin.roles, "events");
  const view = views.some((v) => v.value === rawView) ? (rawView as (typeof views)[number]["value"]) : manager ? "upcoming" : "past";
  const now = await requestTime();
  const shown = events.filter((e) =>
    view === "upcoming" ? Date.parse(e.endsAt) >= now && e.published : view === "past" ? Date.parse(e.endsAt) < now && e.published : view === "drafts" ? !e.published : true,
  );
  if (view === "upcoming") shown.reverse();

  return (
    <>
      <PageHeader
        title="Events"
        description={manager ? "Create and publish events, and manage their RSVPs. Past events that were never on the site can be added too, to document them." : "Document past events: add ones that were never on the site, write the recap and add the photo gallery."}
      >
        <Link href="/admin/events/past/new" className="btn-pill btn-ghost text-[0.8rem]">
          Add a past event
        </Link>
        {manager && (
          <Link href="/admin/events/new" className="btn-pill btn-primary text-[0.8rem]">
            New event
          </Link>
        )}
      </PageHeader>

      <nav aria-label="Filter events" className="mb-5 flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.value}
            href={`/admin/events?view=${v.value}`}
            aria-current={view === v.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[0.85rem] transition-colors",
              view === v.value ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <Empty title="Nothing here">{view === "drafts" ? "Unpublished events show up here." : null}</Empty>
      ) : (
        <Table head={["Event", "When", "Status", "RSVPs", "Documentation"]}>
          {shown.map((e) => {
            const past = Date.parse(e.endsAt) < now;
            return (
              <Row key={e.id}>
                <Cell>
                  <Link href={`/admin/events/${e.id}${!manager ? "?tab=recap" : ""}`} className="text-fg hover:text-flare">
                    {e.title}
                  </Link>
                  <span className="block text-[0.8rem] text-muted">{categoryLabels[e.category]} · {e.venue || "No venue"}</span>
                </Cell>
                <Cell label="When" className="whitespace-nowrap text-body/85">{formatWhen(e.startsAt)}</Cell>
                <Cell label="Status">{e.published ? <Pill tone={past ? "grey" : "green"}>{past ? "Past" : "Published"}</Pill> : <Pill tone="orange">Draft</Pill>}</Cell>
                <Cell label="RSVPs" className="tabular-nums">
                  {e.rsvp.enabled ? `${e.rsvp.registered}${e.rsvp.capacity ? ` / ${e.rsvp.capacity}` : ""}${e.rsvp.waitlisted ? ` (+${e.rsvp.waitlisted})` : ""}` : <span className="text-muted">Off</span>}
                  {e.rsvp.enabled && e.rsvp.closed && !past && (
                    <span className="mt-1 block">
                      <Pill tone="orange">Closed</Pill>
                    </span>
                  )}
                </Cell>
                <Cell label="Docs">
                  {past ? (
                    <span className="flex flex-wrap gap-1.5">
                      <Pill tone={e.recap ? "green" : "orange"}>{e.recap ? "Recap" : "No recap"}</Pill>
                      <Pill tone={e.photoCount ? "green" : "grey"}>{e.photoCount} photos</Pill>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </>
  );
}
