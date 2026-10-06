import "server-only";
import { cookies } from "next/headers";
import { getEvents } from "@/lib/events/queries";
import type { JuktiEvent } from "@/lib/events/types";
import { createSessionClient } from "@/lib/supabase/server";
import type { MemberMode } from "./account";

export type EventActivity = {
  event: JuktiEvent;
  status: "registered" | "waitlisted" | "cancelled";
  /** When they were checked in at the door (they attended), or null. */
  checkedInAt: string | null;
  ticketCode: string | null;
  /** A fee not paid (or not confirmed) yet. */
  unpaid: boolean;
};

export type HelplineActivity = { kind: "question" | "answer"; questionId: string; title: string; status: string; createdAt: string };

export type Activity = { events: EventActivity[]; helpline: HelplineActivity[] };

/** The signed-in user's RSVPs (newest event first) and helpline posts. Request-time only. */
export async function getActivity(mode: MemberMode, userId: string): Promise<Activity> {
  const events = await getEvents();
  const byId = new Map(events.map((e) => [e.id, e]));

  if (mode === "preview") return { events: await previewEvents(events), helpline: [] };

  const supabase = await createSessionClient();
  const [rsvps, posts] = await Promise.all([
    supabase.from("event_registrations").select("event_id, status, checked_in_at, ticket_code, payment_status").eq("user_id", userId),
    supabase.rpc("my_helpline_activity"),
  ]);
  if (rsvps.error) throw new Error(`Couldn't load your RSVPs: ${rsvps.error.message}`);

  return {
    events: (rsvps.data as { event_id: string; status: EventActivity["status"]; checked_in_at: string | null; ticket_code: string | null; payment_status: string }[])
      .flatMap((r) => {
        const event = byId.get(r.event_id);
        return event
          ? [{ event, status: r.status, checkedInAt: r.checked_in_at, ticketCode: r.ticket_code, unpaid: r.payment_status === "unpaid" || r.payment_status === "submitted" }]
          : [];
      })
      .sort((a, b) => Date.parse(b.event.startsAt) - Date.parse(a.event.startsAt)),
    helpline: ((posts.data ?? []) as { kind: "question" | "answer"; question_id: string; title: string; status: string; created_at: string }[]).map((p) => ({
      kind: p.kind,
      questionId: p.question_id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
    })),
  };
}

/**
 * Preview: the RSVPs made in this browser (see lib/events/rsvp.ts), plus the most recent
 * past event as if attended, so the certificate can be tried.
 */
async function previewEvents(events: JuktiEvent[]): Promise<EventActivity[]> {
  let rsvps: Record<string, EventActivity["status"]> = {};
  try {
    rsvps = (JSON.parse((await cookies()).get("jukti-rsvp-preview")?.value ?? "{}") as { rsvps?: typeof rsvps }).rsvps ?? {};
  } catch {}
  const past = events.filter((e) => Date.parse(e.endsAt) < Date.now()).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  const list: EventActivity[] = Object.entries(rsvps).flatMap(([id, status]) => {
    const event = events.find((e) => e.id === id);
    return event ? [{ event, status, checkedInAt: null, ticketCode: null, unpaid: false }] : [];
  });
  if (past && !list.some((a) => a.event.id === past.id)) list.push({ event: past, status: "registered", checkedInAt: past.startsAt, ticketCode: null, unpaid: false });
  return list.sort((a, b) => Date.parse(b.event.startsAt) - Date.parse(a.event.startsAt));
}
