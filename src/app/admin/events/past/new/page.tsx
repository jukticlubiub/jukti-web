import { Suspense } from "react";
import { PastEventForm } from "@/components/admin/events/PastEventForm";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { canOpenEvents } from "@/lib/admin/roles";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Add a past event" };

export default function NewPastEventPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewPastEvent />
    </Suspense>
  );
}

async function NewPastEvent() {
  const admin = await requireArea(canOpenEvents);
  return (
    <>
      <PageHeader
        title="Add a past event"
        back={{ href: "/admin/events?view=past", label: "Events" }}
        description="For events that already happened, to document them on the site. It’s published straight away; after saving, add the photos."
      />
      <Panel>
        <PastEventForm live={admin.mode === "live"} />
      </Panel>
    </>
  );
}
