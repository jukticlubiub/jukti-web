import "server-only";
import { samplePhotos, sampleEvents } from "@/lib/data/events";
import { eventCategories, type EventCategory, type EventPhoto, type JuktiEvent, parseRsvpFields, parseRsvpQuestions } from "@/lib/events/types";
import type { Admin } from "../access";
import { adminDb } from "../guard";

export type AdminEvent = JuktiEvent & {
  published: boolean;
  /** The wide cover as stored (cover.url falls back to the square one for display). */
  coverWideUrl: string | null;
};

export type Registration = {
  id: string;
  /** The auth user who RSVP'd. Links to their member profile when isMember. */
  userId: string;
  isMember: boolean;
  fullName: string;
  email: string;
  /** Empty for guests from outside IUB. */
  studentId: string;
  /** Collected optional fields (department/phone/blood_group) and custom answers, keyed by field/question id. */
  answers: Record<string, unknown>;
  status: "registered" | "waitlisted" | "cancelled";
  queuedAt: string;
  checkedInAt: string | null;
  createdAt: string;
  ticketCode: string;
  payment: { status: "not_required" | "unpaid" | "submitted" | "paid"; sender: string | null; txn: string | null; submittedAt: string | null; paidAt: string | null; paidBy: string | null };
};

type Row = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  cover_url: string | null;
  cover_square_url: string | null;
  cover_alt: string;
  agenda: unknown;
  recap: string | null;
  rsvp_enabled: boolean;
  rsvp_deadline: string | null;
  capacity: number | null;
  audience: string;
  rsvp_fields: unknown;
  rsvp_questions: unknown;
  fee_amount: number | null;
  fee_bkash_number: string | null;
  fee_note: string | null;
  published: boolean;
  event_photos: { count: number }[];
};

const COLUMNS =
  "id, slug, title, summary, description, category, starts_at, ends_at, venue, cover_url, cover_square_url, cover_alt, agenda, recap, rsvp_enabled, rsvp_deadline, capacity, audience, rsvp_fields, rsvp_questions, fee_amount, fee_bkash_number, fee_note, published, event_photos(count)";

function toEvent(r: Row, counts?: { registered: number; waitlisted: number }): AdminEvent {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    description: r.description,
    category: (eventCategories as readonly string[]).includes(r.category) ? (r.category as EventCategory) : "workshop",
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venue: r.venue,
    cover: r.cover_url || r.cover_square_url ? { url: (r.cover_url || r.cover_square_url)!, alt: r.cover_alt, squareUrl: r.cover_square_url } : null,
    agenda: Array.isArray(r.agenda) ? r.agenda : [],
    recap: r.recap,
    rsvp: { enabled: r.rsvp_enabled, deadline: r.rsvp_deadline, capacity: r.capacity, registered: counts?.registered ?? 0, waitlisted: counts?.waitlisted ?? 0, audience: r.audience === "open" ? "open" : "iub", fields: parseRsvpFields(r.rsvp_fields), questions: parseRsvpQuestions(r.rsvp_questions) },
    photoCount: r.event_photos[0]?.count ?? 0,
    fee: r.fee_amount && r.fee_amount > 0 ? { amount: r.fee_amount, bkashNumber: r.fee_bkash_number, note: r.fee_note } : null,
    published: r.published,
    coverWideUrl: r.cover_url,
  };
}

/** Every event, drafts included, newest first. */
export async function listEvents(admin: Admin): Promise<AdminEvent[]> {
  if (admin.mode === "preview") return sampleEvents.map((e) => ({ ...e, published: true, coverWideUrl: e.cover?.url ?? null }));
  const db = await adminDb();
  const [events, counts] = await Promise.all([db.from("events").select(COLUMNS).order("starts_at", { ascending: false }), db.rpc("event_rsvp_counts")]);
  if (events.error) throw new Error(`Couldn't load events: ${events.error.message}`);
  const byId = new Map(((counts.data as { event_id: string; registered: number; waitlisted: number }[] | null) ?? []).map((c) => [c.event_id, c]));
  return (events.data as Row[]).map((r) => toEvent(r, byId.get(r.id)));
}

export async function getAdminEvent(admin: Admin, id: string): Promise<AdminEvent | null> {
  if (admin.mode === "preview") {
    const e = sampleEvents.find((x) => x.id === id);
    return e ? { ...e, published: true, coverWideUrl: e.cover?.url ?? null } : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await adminDb();
  const { data, error } = await db.from("events").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the event: ${error.message}`);
  if (!data) return null;
  const { data: counts } = await db.rpc("event_rsvp_counts", { p_event_ids: [id] });
  return toEvent(data as Row, (counts as { registered: number; waitlisted: number }[] | null)?.[0]);
}

export async function getEventPhotosForAdmin(admin: Admin, event: AdminEvent): Promise<(EventPhoto & { position: number })[]> {
  if (admin.mode === "preview") return samplePhotos(event.slug).map((p, i) => ({ ...p, position: i }));
  const db = await adminDb();
  const { data, error } = await db.from("event_photos").select("id, url, alt, width, height, position").eq("event_id", event.id).order("position");
  if (error) throw new Error(`Couldn't load photos: ${error.message}`);
  return data as (EventPhoto & { position: number })[];
}

/** RSVPs for an event (Event Manager), in sign-up order. */
export async function getRegistrations(admin: Admin, eventId: string): Promise<Registration[]> {
  if (admin.mode === "preview") return [];
  const db = await adminDb();
  const { data, error } = await db
    .from("event_registrations")
    .select("id, user_id, full_name, email, student_id, answers, status, queued_at, checked_in_at, created_at, ticket_code, payment_status, payment_sender, payment_txn, payment_submitted_at, paid_at, paid_by")
    .eq("event_id", eventId)
    .order("queued_at");
  if (error) throw new Error(`Couldn't load RSVPs: ${error.message}`);
  const rows = data as {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    student_id: string | null;
    answers: unknown;
    status: Registration["status"];
    queued_at: string;
    checked_in_at: string | null;
    created_at: string;
    ticket_code: string;
    payment_status: Registration["payment"]["status"];
    payment_sender: string | null;
    payment_txn: string | null;
    payment_submitted_at: string | null;
    paid_at: string | null;
    paid_by: string | null;
  }[];

  // Which registrants are JUKTI members (so the list can link to their profile).
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const memberIds = new Set<string>();
  if (userIds.length) {
    const { data: members } = await db.from("members").select("id").in("id", userIds);
    for (const m of (members as { id: string }[] | null) ?? []) memberIds.add(m.id);
  }

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    isMember: memberIds.has(r.user_id),
    fullName: r.full_name,
    email: r.email,
    studentId: r.student_id ?? "",
    answers: r.answers && typeof r.answers === "object" ? (r.answers as Record<string, unknown>) : {},
    status: r.status,
    queuedAt: r.queued_at,
    checkedInAt: r.checked_in_at,
    createdAt: r.created_at,
    ticketCode: r.ticket_code,
    payment: { status: r.payment_status, sender: r.payment_sender, txn: r.payment_txn, submittedAt: r.payment_submitted_at, paidAt: r.paid_at, paidBy: r.paid_by },
  }));
}

/** Scan stations at an event besides the entry, e.g. "Lunch". */
export type Station = { id: string; name: string };

export async function getStations(admin: Admin, eventId: string): Promise<Station[]> {
  if (admin.mode === "preview") return [{ id: "preview-lunch", name: "Lunch" }];
  const db = await adminDb();
  const { data, error } = await db.from("event_stations").select("id, name").eq("event_id", eventId).order("position").order("created_at");
  if (error) throw new Error(`Couldn't load stations: ${error.message}`);
  return data as Station[];
}

/** Who was scanned at which station: registration id → station id → when. */
export async function getStationScans(admin: Admin, stations: Station[]): Promise<Map<string, Record<string, string>>> {
  const scans = new Map<string, Record<string, string>>();
  if (admin.mode === "preview" || stations.length === 0) return scans;
  const db = await adminDb();
  const { data, error } = await db.from("station_scans").select("station_id, registration_id, scanned_at").in("station_id", stations.map((s) => s.id));
  if (error) throw new Error(`Couldn't load scans: ${error.message}`);
  for (const s of data as { station_id: string; registration_id: string; scanned_at: string }[]) {
    scans.set(s.registration_id, { ...scans.get(s.registration_id), [s.station_id]: s.scanned_at });
  }
  return scans;
}
