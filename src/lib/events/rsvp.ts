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

export type PaymentStatus = "not_required" | "unpaid" | "submitted" | "paid";

export type RsvpRegistration = {
  status: "registered" | "waitlisted";
  /** Place on the waitlist, 1 = next in line. */
  position: number | null;
  /** Their ticket, e.g. JT-7K3M9Q: scanned at the entry, and the bKash reference for a fee. */
  ticketCode: string | null;
  payment: { status: PaymentStatus; sender: string | null; txn: string | null };
};

type RegistrationRow = {
  status: "registered" | "waitlisted";
  position: number | null;
  ticket_code?: string | null;
  payment_status?: PaymentStatus;
  payment_sender?: string | null;
  payment_txn?: string | null;
};

export function toRegistration(row: RegistrationRow | null | undefined): RsvpRegistration | null {
  if (!row) return null;
  return {
    status: row.status,
    position: row.position,
    ticketCode: row.ticket_code ?? null,
    payment: { status: row.payment_status ?? "not_required", sender: row.payment_sender ?? null, txn: row.payment_txn ?? null },
  };
}

export type RsvpViewer = {
  name: string;
  email: string;
  studentId: string;
  /** Prefill for configurable fields, from the member's profile when they have one. */
  department?: string;
  phone?: string;
  bloodGroup?: string;
};

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

  const [seats, mine, member, previous] = await Promise.all([
    getLiveSeats(event),
    claims ? supabase.rpc("my_event_registration", { p_event_id: event.id }) : null,
    // Members' own profile fills the form first.
    claims ? supabase.from("members").select("name, iub_id, department, contact_number, blood_group").eq("id", claims.sub).maybeSingle() : null,
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
      name: member?.data?.name || previous?.data?.full_name || metadata.full_name || metadata.name || "",
      email: typeof claims.email === "string" ? claims.email : "",
      studentId: member?.data?.iub_id || previous?.data?.student_id || "",
      department: member?.data?.department || "",
      phone: member?.data?.contact_number || "",
      bloodGroup: member?.data?.blood_group || "",
    },
    registration: toRegistration(mine?.data as RegistrationRow | null),
  };
}

// ---------------------------------------------------------------------------
// Preview (development without Supabase): RSVPs live in a cookie in this browser.
// ---------------------------------------------------------------------------

const PREVIEW_COOKIE = "jukti-rsvp-preview";

type PreviewStore = {
  viewer?: RsvpViewer;
  rsvps: Record<string, RsvpRegistration["status"]>;
  /** Payments reported in preview, by event id. */
  payments?: Record<string, { sender: string; txn: string | null }>;
};

/** A stable pretend ticket code per event, for preview mode. */
function previewTicket(eventId: string) {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let h = 0;
  for (const c of eventId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let code = "JT-";
  for (let i = 0; i < 6; i++) {
    code += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + 7919 * (i + 1);
  }
  return code;
}

async function readPreview(): Promise<PreviewStore> {
  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  try {
    const parsed = raw ? (JSON.parse(raw) as PreviewStore) : null;
    return { viewer: parsed?.viewer, rsvps: parsed?.rsvps ?? {}, payments: parsed?.payments ?? {} };
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
      ? {
          status,
          position: status === "waitlisted" ? event.rsvp.waitlisted + 1 : null,
          ticketCode: previewTicket(event.id),
          payment: event.fee
            ? store.payments?.[event.id]
              ? { status: "submitted", sender: store.payments[event.id].sender, txn: store.payments[event.id].txn }
              : { status: "unpaid", sender: null, txn: null }
            : { status: "not_required", sender: null, txn: null },
        }
      : null,
  };
}

export async function previewRegister(event: JuktiEvent, viewer: RsvpViewer) {
  const store = await readPreview();
  const { capacity, registered } = event.rsvp;
  const status = store.rsvps[event.id] ?? (capacity !== null && registered >= capacity ? "waitlisted" : "registered");
  await writePreview({ viewer, rsvps: { ...store.rsvps, [event.id]: status } });
}

export async function previewPay(event: JuktiEvent, payment: { sender: string; txn: string | null }) {
  const store = await readPreview();
  await writePreview({ ...store, payments: { ...store.payments, [event.id]: payment } });
}

export async function previewCancel(event: JuktiEvent) {
  const store = await readPreview();
  const rest = { ...store.rsvps };
  delete rest[event.id];
  await writePreview({ ...store, rsvps: rest });
}
