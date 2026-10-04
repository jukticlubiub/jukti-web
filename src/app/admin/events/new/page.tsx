import { Suspense } from "react";
import { EventForm } from "@/components/admin/events/EventForm";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewEvent />
    </Suspense>
  );
}

async function NewEvent() {
  const admin = await requireArea("events");
  return (
    <>
      <PageHeader title="New event" back={{ href: "/admin/events", label: "Events" }} description="Save it unpublished to keep working on it; publish when it’s ready." />
      <Panel>
        <EventForm live={admin.mode === "live"} />
      </Panel>
    </>
  );
}
