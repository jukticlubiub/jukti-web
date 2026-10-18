import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { samplePhotos, sampleEvents } from "@/lib/data/events";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { eventCategories, type EventCategory, type EventPhoto, type EventSeats, type JuktiEvent, parseRsvpFields, parseRsvpQuestions } from "./types";

/** Cache tag for everything event-related. Invalidate it after any change to events or RSVPs. */
export const EVENTS_TAG = "events";

type EventRow = {
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
  event_photos: { count: number }[];
};

type CountRow = { event_id: string; registered: number; waitlisted: number };

const EVENT_COLUMNS =
  "id, slug, title, summary, description, category, starts_at, ends_at, venue, cover_url, cover_square_url, cover_alt, agenda, recap, rsvp_enabled, rsvp_deadline, capacity, audience, rsvp_fields, rsvp_questions, fee_amount, fee_bkash_number, fee_note, event_photos(count)";

function toEvent(row: EventRow, counts?: CountRow): JuktiEvent {
  const category = (eventCategories as readonly string[]).includes(row.category)
    ? (row.category as EventCategory)
    : "workshop";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venue: row.venue,
    cover: row.cover_url || row.cover_square_url ? { url: (row.cover_url || row.cover_square_url)!, alt: row.cover_alt, squareUrl: row.cover_square_url } : null,
    agenda: Array.isArray(row.agenda) ? row.agenda : [],
    recap: row.recap,
    rsvp: {
      enabled: row.rsvp_enabled,
      deadline: row.rsvp_deadline,
      capacity: row.capacity,
      registered: counts?.registered ?? 0,
      waitlisted: counts?.waitlisted ?? 0,
      audience: row.audience === "open" ? "open" : "iub",
      fields: parseRsvpFields(row.rsvp_fields),
      questions: parseRsvpQuestions(row.rsvp_questions),
    },
    fee: row.fee_amount && row.fee_amount > 0 ? { amount: row.fee_amount, bkashNumber: row.fee_bkash_number, note: row.fee_note } : null,
    photoCount: row.event_photos[0]?.count ?? 0,
  };
}

/** Every published event, latest start first. Shared by all visitors and cached. */
export async function getEvents(): Promise<JuktiEvent[]> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  if (!supabaseEnv) return sampleEvents;

  const supabase = createPublicClient();
  const [events, counts] = await Promise.all([
    supabase.from("events").select(EVENT_COLUMNS).eq("published", true).order("starts_at", { ascending: false }),
    supabase.rpc("event_rsvp_counts"),
  ]);
  if (events.error) throw new Error(`Couldn't load events: ${events.error.message}`);
  if (counts.error) throw new Error(`Couldn't load RSVP counts: ${counts.error.message}`);

  const countsById = new Map((counts.data as CountRow[]).map((c) => [c.event_id, c]));
  return (events.data as EventRow[]).map((row) => toEvent(row, countsById.get(row.id)));
}

export async function getEvent(slug: string) {
  return (await getEvents()).find((event) => event.slug === slug) ?? null;
}

export async function getEventById(id: string) {
  return (await getEvents()).find((event) => event.id === id) ?? null;
}

/** An event's gallery, in the order the editors set. */
export async function getEventPhotos(eventId: string): Promise<EventPhoto[]> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  if (!supabaseEnv) return samplePhotos(eventId);

  const { data, error } = await createPublicClient()
    .from("event_photos")
    .select("id, url, alt, width, height")
    .eq("event_id", eventId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Couldn't load photos: ${error.message}`);
  return data;
}

/** Live seat counts for one event, bypassing the cache (for the RSVP panel). */
export async function getLiveSeats(event: JuktiEvent): Promise<EventSeats> {
  const seats = { capacity: event.rsvp.capacity, registered: event.rsvp.registered, waitlisted: event.rsvp.waitlisted };
  if (!supabaseEnv) return seats;
  const { data, error } = await createPublicClient().rpc("event_rsvp_counts", { p_event_ids: [event.id] });
  if (error || !data?.[0]) return seats;
  const row = data[0] as CountRow;
  return { ...seats, registered: row.registered, waitlisted: row.waitlisted };
}
