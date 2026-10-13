"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { emailPaymentConfirmed } from "@/lib/events/emails";
import { EVENTS_TAG } from "@/lib/events/queries";
import { getAdminEvent } from "../data/events";
import { eventCategories } from "@/lib/events/types";
import { type ActionState, bool, explainDbError, failed, fieldErrors, fromDhakaInput, ok, optional, slugify, str } from "../form";
import { guard } from "../guard";
import { keepImageOr } from "../remote-image";

const isPR = (roles: string[]) => roles.includes("pr_editor") || roles.includes("master_admin");

/* ---------- Event details (Event Manager) ---------- */

const eventSchema = z
  .object({
    title: z.string().min(1, "Give the event a title.").max(140),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
    summary: z.string().max(300, "Keep the summary to a sentence or two."),
    description: z.string().max(10000),
    category: z.enum(eventCategories),
    startsAt: z.string({ error: "Set when it starts." }),
    endsAt: z.string({ error: "Set when it ends." }),
    venue: z.string().max(200),
    coverUrl: z.string().nullable(),
    coverAlt: z.string().max(200),
    agenda: z.array(z.object({ time: z.string(), title: z.string(), detail: z.string().optional() })),
    rsvpEnabled: z.boolean(),
    rsvpDeadline: z.string().nullable(),
    capacity: z.number().int().positive("Capacity must be at least 1.").nullable(),
    feeAmount: z.number({ error: "Enter the fee in taka." }).int("Whole taka only.").min(0).max(100000).nullable(),
    feeBkashNumber: z.string().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a Bangladeshi mobile number.").nullable(),
    feeNote: z.string().max(500, "Keep it under 500 characters.").nullable(),
    published: z.boolean(),
  })
  .refine((e) => Date.parse(e.endsAt) > Date.parse(e.startsAt), { message: "It must end after it starts.", path: ["endsAt"] });

/** Agenda lines: "3:00 PM | Welcome | optional detail". */
function parseAgenda(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [time = "", title = "", ...rest] = line.split("|").map((s) => s.trim());
      return { time, title: title || time, ...(rest.length ? { detail: rest.join(" | ") } : {}) };
    });
}

export async function saveEvent(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const capacityRaw = str(fd, "capacity");
  const values = {
    title: str(fd, "title"),
    slug: str(fd, "slug") || slugify(str(fd, "title")),
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    startsAt: fromDhakaInput(str(fd, "startsAt")) ?? undefined,
    endsAt: fromDhakaInput(str(fd, "endsAt")) ?? undefined,
    venue: str(fd, "venue"),
    coverUrl: optional(fd, "coverUrl"),
    coverAlt: str(fd, "coverAlt"),
    agenda: parseAgenda(str(fd, "agenda")),
    rsvpEnabled: bool(fd, "rsvpEnabled"),
    rsvpDeadline: fromDhakaInput(str(fd, "rsvpDeadline")),
    capacity: capacityRaw ? Number(capacityRaw) : null,
    feeAmount: str(fd, "feeAmount") ? Number(str(fd, "feeAmount")) : null,
    feeBkashNumber: optional(fd, "feeBkashNumber")?.replace(/[\s-]/g, "") ?? null,
    feeNote: optional(fd, "feeNote"),
    published: bool(fd, "published"),
  };
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const e = parsed.data;
  if (e.coverUrl && !e.coverAlt) return failed("Describe the cover image for people who can’t see it.", { coverAlt: "Describe the image." });
  const cover = await keepImageOr(g.db, e.coverUrl, "events");
  if ("error" in cover) return failed(cover.error, { coverUrl: cover.error });

  const row = {
    title: e.title,
    slug: e.slug,
    summary: e.summary,
    description: e.description,
    category: e.category,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    venue: e.venue,
    cover_url: cover.url,
    cover_alt: e.coverAlt,
    agenda: e.agenda,
    rsvp_enabled: e.rsvpEnabled,
    rsvp_deadline: e.rsvpDeadline,
    capacity: e.capacity,
    fee_amount: e.feeAmount || null,
    fee_bkash_number: e.feeBkashNumber,
    fee_note: e.feeNote,
    published: e.published,
  };
  const res = id ? await g.db.from("events").update(row).eq("id", id).select("id").single() : await g.db.from("events").insert(row).select("id").single();
  if (res.error) {
    if (res.error.message.includes("duplicate key")) return failed("Another event already uses that web address.", { slug: "Choose a different one." });
    return failed(explainDbError(res.error.message));
  }
  updateTag(EVENTS_TAG);
  return ok(previous, id ? "Event saved." : "Event created.", res.data.id);
}

/* ---------- Past events (PR Editors and Event Managers) ---------- */

const canDocument = (roles: string[]) => isPR(roles) || roles.includes("event_manager");

const pastSchema = z
  .object({
    title: z.string().min(1, "Give the event a title.").max(140),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
    summary: z.string().max(300, "Keep the summary to a sentence or two."),
    description: z.string().max(10000),
    category: z.enum(eventCategories),
    startsAt: z.string({ error: "Set when it started." }),
    endsAt: z.string({ error: "Set when it ended." }),
    venue: z.string().max(200),
    coverUrl: z.string().nullable(),
    coverAlt: z.string().max(200),
    recap: z.string().max(10000, "Keep the recap under 10,000 characters."),
  })
  .refine((e) => Date.parse(e.endsAt) > Date.parse(e.startsAt), { message: "It must end after it starts.", path: ["endsAt"] })
  .refine((e) => Date.parse(e.endsAt) < Date.now(), { message: "This is for events that are over. Use New event for upcoming ones.", path: ["endsAt"] });

/**
 * Add (or fix the details of) an event that already happened, to document it: no RSVPs,
 * published straight away. New ones open on their Recap & gallery tab.
 */
export async function savePastEvent(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(canDocument);
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = pastSchema.safeParse({
    title: str(fd, "title"),
    slug: str(fd, "slug") || slugify(str(fd, "title")),
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    startsAt: fromDhakaInput(str(fd, "startsAt")) ?? undefined,
    endsAt: fromDhakaInput(str(fd, "endsAt")) ?? undefined,
    venue: str(fd, "venue"),
    coverUrl: optional(fd, "coverUrl"),
    coverAlt: str(fd, "coverAlt"),
    recap: str(fd, "recap"),
  });
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const e = parsed.data;
  if (e.coverUrl && !e.coverAlt) return failed("Describe the cover image for people who can’t see it.", { coverAlt: "Describe the image." });
  const cover = await keepImageOr(g.db, e.coverUrl, "events");
  if ("error" in cover) return failed(cover.error, { coverUrl: cover.error });

  const row = {
    title: e.title,
    slug: e.slug,
    summary: e.summary,
    description: e.description,
    category: e.category,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    venue: e.venue,
    cover_url: cover.url,
    cover_alt: e.coverAlt,
    recap: e.recap || null,
    rsvp_enabled: false,
    published: true,
  };
  const res = id ? await g.db.from("events").update(row).eq("id", id).select("id").maybeSingle() : await g.db.from("events").insert(row).select("id").single();
  if (res.error) {
    if (res.error.message.includes("duplicate key")) return failed("Another event already uses that web address.", { slug: "Choose a different one." });
    return failed(explainDbError(res.error.message));
  }
  if (!res.data) return failed("Only events that are over can be changed here.");
  updateTag(EVENTS_TAG);
  return ok(previous, id ? "Saved." : "Past event added. Now add its photos.", res.data.id);
}

/* ---------- RSVPs (Event Manager) ---------- */

export async function cancelRegistration(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const { error } = await g.db.rpc("admin_cancel_registration", { p_registration_id: str(fd, "id") });
  if (error) return failed(explainDbError(error.message));
  updateTag(EVENTS_TAG);
  return ok(previous, "RSVP cancelled.");
}

/** Confirm (or undo) someone's event fee after checking the bKash statement. Confirming emails them. */
export async function setPaid(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const paid = str(fd, "paid") === "true";
  const { data, error } = await g.db
    .from("event_registrations")
    .update(
      paid
        ? { payment_status: "paid", paid_at: new Date().toISOString(), paid_by: g.admin.email }
        : { payment_status: "unpaid", paid_at: null, paid_by: null },
    )
    .eq("id", id)
    .neq("payment_status", "not_required")
    .select("event_id, full_name, email, ticket_code")
    .maybeSingle();
  if (error) return failed(explainDbError(error.message));
  if (!data) return failed("This RSVP doesn’t have a fee.");
  if (paid) {
    const event = await getAdminEvent(g.admin, data.event_id as string);
    if (event) {
      const to = { email: data.email as string, name: data.full_name as string };
      after(() => emailPaymentConfirmed(event, to, data.ticket_code as string).catch((e) => console.error("Payment email failed:", e)));
    }
  }
  refresh();
  return ok(previous, paid ? "Marked paid. We’ve emailed them." : "Marked unpaid.");
}

export async function toggleCheckIn(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const checkedIn = str(fd, "checkedIn") === "true";
  const { error } = await g.db
    .from("event_registrations")
    .update({ checked_in_at: checkedIn ? null : new Date().toISOString() })
    .eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  return ok(previous, checkedIn ? "Check-in undone." : "Checked in.");
}

/* ---------- Documentation of past events (PR Editor) ---------- */

export async function saveRecap(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(isPR);
  if (!g.ok) return g.state;
  const recap = str(fd, "recap");
  if (recap.length > 10000) return failed("Keep the recap under 10,000 characters.", { recap: "Too long." });
  const { error } = await g.db.rpc("set_event_recap", { p_event_id: str(fd, "eventId"), p_recap: recap });
  if (error) return failed(explainDbError(error.message));
  updateTag(EVENTS_TAG);
  return ok(previous, "Recap saved.");
}

const photoSchema = z.object({ url: z.url(), width: z.number().int().positive(), height: z.number().int().positive(), alt: z.string().max(200) });

/** Adds uploaded photos (JSON list in `photos`) to the end of an event's gallery. */
export async function addPhotos(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(isPR);
  if (!g.ok) return g.state;
  const eventId = str(fd, "eventId");
  let photos: z.infer<typeof photoSchema>[];
  try {
    photos = z.array(photoSchema).min(1).parse(JSON.parse(str(fd, "photos")));
  } catch {
    return failed("Those photos couldn’t be added.");
  }
  const { data: last } = await g.db.from("event_photos").select("position").eq("event_id", eventId).order("position", { ascending: false }).limit(1).maybeSingle();
  const start = ((last as { position: number } | null)?.position ?? -1) + 1;
  const { error } = await g.db.from("event_photos").insert(photos.map((p, i) => ({ event_id: eventId, ...p, position: start + i })));
  if (error) return failed(explainDbError(error.message));
  updateTag(EVENTS_TAG);
  return ok(previous, `Added ${photos.length} ${photos.length === 1 ? "photo" : "photos"}.`);
}

export async function updatePhoto(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(isPR);
  if (!g.ok) return g.state;
  const alt = str(fd, "alt");
  if (alt.length > 200) return failed("Keep the description short.");
  const { error } = await g.db.from("event_photos").update({ alt }).eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  updateTag(EVENTS_TAG);
  return ok(previous, "Saved.");
}

/** Swaps a photo with its neighbour (`direction` up or down). */
/** Save a gallery's new order (dragged into place): `ids` is every photo of the event, in order. */
export async function reorderPhotos(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(isPR);
  if (!g.ok) return g.state;
  let ids: unknown;
  try {
    ids = JSON.parse(str(fd, "ids"));
  } catch {
    return failed("The new order couldn’t be read.");
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return failed("The new order couldn’t be read.");
  const { data, error } = await g.db.from("event_photos").select("id, position").eq("event_id", str(fd, "eventId")).order("position");
  if (error) return failed(explainDbError(error.message));
  const list = (data as { id: string; position: number }[] | null) ?? [];
  const saved = new Map(list.map((p) => [p.id, p.position]));
  if (ids.length !== list.length || new Set(ids).size !== ids.length || !ids.every((id) => saved.has(id))) {
    return failed("The gallery changed meanwhile. Reload the page and try again.");
  }
  for (const [position, id] of (ids as string[]).entries()) {
    if (saved.get(id) === position) continue;
    const { error: updateError } = await g.db.from("event_photos").update({ position }).eq("id", id);
    if (updateError) return failed(explainDbError(updateError.message));
  }
  updateTag(EVENTS_TAG);
  return ok(previous, "Order saved.");
}

export async function deletePhoto(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(isPR);
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const { data } = await g.db.from("event_photos").select("url").eq("id", id).maybeSingle();
  const { error } = await g.db.from("event_photos").delete().eq("id", id);
  if (error) return failed(explainDbError(error.message));
  // Remove the file too, if it's in our bucket.
  const url = (data as { url: string } | null)?.url ?? "";
  const marker = "/storage/v1/object/public/media/";
  if (url.includes(marker)) await g.db.storage.from("media").remove([url.split(marker)[1]]);
  updateTag(EVENTS_TAG);
  return ok(previous, "Photo deleted.");
}
