import "server-only";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { getLiveSeats } from "./queries";
import { rsvpClosesAt } from "./time";
import type { EventSeats, JuktiEvent } from "./types";

/**
 * live: RSVPs are stored in Supabase and need a Google sign-in.
 * preview: no Supabase yet, in development. RSVPs are kept in a cookie in this browser
 *   so the whole flow can be tried out. Never used in production.
 * off: no Supabase in production. The panel says online RSVP isn't open yet.
 */
export type RsvpMode = "live" | "preview" | "off";

/** none: the event doesn't take RSVPs. closed: past the deadline. ended: the event is over. */
export type RsvpPhase = "none" | "open" | "closed" | "ended";

export type RsvpRegistration = {
  status: "registered" | "waitlisted";
  /** Place on the waitlist, 1 = next in line. */
  position: number | null;
};

export type RsvpViewer = { name: string; email: string; studentId: string };

export type RsvpState = {
  mode: RsvpMode;
  phase: RsvpPhase;
  seats: EventSeats;
  closesAt: string;
  /** Who the form is for. Null when signed out (live mode). */
  viewer: RsvpViewer | null;
  registration: RsvpRegistration | null;
};

export function rsvpMode(): RsvpMode {
  if (supabaseEnv) return "live";
  return process.env.NODE_ENV === "development" ? "preview" : "off";
}

function rsvpPhase(event: JuktiEvent, now: number): RsvpPhase {
  if (!event.rsvp.enabled) return "none";
  if (now >= Date.parse(event.endsAt)) return "ended";
  if (now >= Date.parse(rsvpClosesAt(event))) return "closed";
  return "open";
}

/** The RSVP panel's state for the current visitor. Request-time only (reads cookies and the clock). */
export async function getRsvpState(event: JuktiEvent): Promise<RsvpState> {
  const mode = rsvpMode();
  const base = {
    mode,
    phase: rsvpPhase(event, Date.now()),
    seats: { capacity: event.rsvp.capacity, registered: event.rsvp.registered, waitlisted: event.rsvp.waitlisted },
    closesAt: rsvpClosesAt(event),
  };
  if (base.phase === "none" || mode === "off") return { ...base, viewer: null, registration: null };
  if (mode === "preview") return { ...base, ...(await previewState(event)) };
  return { ...base, ...(await liveState(event)) };
}

// ---------------------------------------------------------------------------
// Live (Supabase)
// ---------------------------------------------------------------------------

async function liveState(event: JuktiEvent): Promise<Pick<RsvpState, "seats" | "viewer" | "registration">> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const [seats, mine, previous] = await Promise.all([
    getLiveSeats(event),
    claims ? supabase.rpc("my_event_registration", { p_event_id: event.id }) : null,
    // Their details from their last RSVP, so the form is filled in next time.
    claims
      ? supabase
          .from("event_registrations")
          .select("full_name, student_id")
          .eq("user_id", claims.sub)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : null,
  ]);

  if (!claims) return { seats, viewer: null, registration: null };

  const metadata = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  return {
    seats,
    viewer: {
      name: previous?.data?.full_name ?? metadata.full_name ?? metadata.name ?? "",
      email: typeof claims.email === "string" ? claims.email : "",
      studentId: previous?.data?.student_id ?? "",
    },
    registration: (mine?.data as RsvpRegistration | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Preview (development without Supabase): RSVPs live in a cookie in this browser.
// ---------------------------------------------------------------------------

const PREVIEW_COOKIE = "jukti-rsvp-preview";

type PreviewStore = {
  viewer?: RsvpViewer;
  rsvps: Record<string, RsvpRegistration["status"]>;
};

async function readPreview(): Promise<PreviewStore> {
  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  try {
    const parsed = raw ? (JSON.parse(raw) as PreviewStore) : null;
    return { viewer: parsed?.viewer, rsvps: parsed?.rsvps ?? {} };
  } catch {
    return { rsvps: {} };
  }
}

async function writePreview(store: PreviewStore) {
  (await cookies()).set(PREVIEW_COOKIE, JSON.stringify(store), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** The sample counts, plus this browser's own RSVP. */
function previewSeats(event: JuktiEvent, status: RsvpRegistration["status"] | undefined): EventSeats {
  return {
    capacity: event.rsvp.capacity,
    registered: event.rsvp.registered + (status === "registered" ? 1 : 0),
    waitlisted: event.rsvp.waitlisted + (status === "waitlisted" ? 1 : 0),
  };
}

async function previewState(event: JuktiEvent): Promise<Pick<RsvpState, "seats" | "viewer" | "registration">> {
  const store = await readPreview();
  const status = store.rsvps[event.id];
  return {
    seats: previewSeats(event, status),
    viewer: store.viewer ?? { name: "", email: "", studentId: "" },
    registration: status
      ? { status, position: status === "waitlisted" ? event.rsvp.waitlisted + 1 : null }
      : null,
  };
}

export async function previewRegister(event: JuktiEvent, viewer: RsvpViewer) {
  const store = await readPreview();
  const { capacity, registered } = event.rsvp;
  const status = store.rsvps[event.id] ?? (capacity !== null && registered >= capacity ? "waitlisted" : "registered");
  await writePreview({ viewer, rsvps: { ...store.rsvps, [event.id]: status } });
}

export async function previewCancel(event: JuktiEvent) {
  const store = await readPreview();
  const rest = { ...store.rsvps };
  delete rest[event.id];
  await writePreview({ ...store, rsvps: rest });
}
