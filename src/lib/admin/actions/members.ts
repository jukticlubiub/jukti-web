"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { SETTINGS_TAG } from "@/lib/content/queries";
import { verifyCardToken } from "@/lib/members/card";
import { emailMemberApproved, emailMemberNeedsAttention } from "@/lib/members/emails";
import { MEMBERS_TAG } from "@/lib/members/public";
import { adminFor, PREVIEW_NOT_SAVED } from "../access";
import { type ActionState, explainDbError, failed, ok, str } from "../form";
import { guard } from "../guard";

const decisions = { approve: "Approved. We’ve emailed them.", reject: "Sent back. We’ve emailed them what to fix.", lapse: "Marked as lapsed." } as const;

/** Approve, send back (reject, with a note the member sees), or mark a member lapsed. */
export async function reviewMember(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const decision = str(fd, "decision") as keyof typeof decisions;
  const note = str(fd, "note");
  if (!(decision in decisions)) return failed("Choose what to do.");
  if (decision !== "approve" && !note) return failed("Add a note: the member sees it.", { note: "Say what’s wrong or what to do." });
  if (note.length > 500) return failed("Keep the note under 500 characters.", { note: "Too long." });

  const { error } = await g.db.rpc("review_member", { p_id: id, p_decision: decision, p_note: note || null });
  if (error) return failed(error.message.includes("note_required") ? "Add a note: the member sees it." : explainDbError(error.message));

  if (decision !== "lapse") {
    const { data } = await g.db.from("members").select("name, email, secondary_email, member_no, review_note").eq("id", id).maybeSingle();
    if (data) {
      const m = { name: data.name as string, email: data.email as string, secondaryEmail: data.secondary_email as string | null, memberNo: data.member_no as string | null, note: data.review_note as string | null };
      after(() => (decision === "approve" ? emailMemberApproved(m) : emailMemberNeedsAttention(m)).catch((e) => console.error("Member email failed:", e)));
    }
  }
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, decisions[decision]);
}

export type ScanOutcome =
  | "checked_in"
  | "already_checked_in"
  | "served"
  | "already_served"
  | "no_rsvp"
  | "waitlisted"
  | "cancelled"
  | "unpaid"
  | "unknown_member"
  | "unknown_ticket"
  | "wrong_event"
  | "wrong_station";

export type CheckInState = {
  status: "idle" | "ok" | "error";
  message?: string;
  person?: { name: string; memberNo: string | null; photoUrl: string | null; memberStatus: string };
  outcome?: ScanOutcome;
  /** When it happened, or first happened (for "already"). */
  at?: string | null;
  /** A station scan that also checked them in (they skipped the gate scanner). */
  alsoCheckedIn?: boolean;
  /** Increases on each scan, so the scanner can show each result fresh. */
  seq?: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dhakaTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });

/**
 * One scan (Event Manager): a member card (`code`) or a typed member number, at the entry
 * or at a station (`stationId`, e.g. Lunch). The database decides it in one step, so two
 * scanners can't both let the same person in or serve them twice.
 */
export async function checkInMember(previous: CheckInState, fd: FormData): Promise<CheckInState> {
  const seq = (previous.seq ?? 0) + 1;
  const admin = await adminFor("events");
  if (!admin) return { status: "error", message: "Your role doesn’t allow scanning.", seq };
  if (admin.mode === "preview") return { status: "error", message: PREVIEW_NOT_SAVED, seq };
  const eventId = str(fd, "eventId");
  const stationId = str(fd, "stationId") || null;
  const stationName = str(fd, "stationName") || "this station";
  const code = str(fd, "code");
  if (!UUID.test(eventId) || (stationId && !UUID.test(stationId)) || !code) return { status: "error", message: "Scan a member card or type a member number.", seq };

  const g = await guard("events");
  if (!g.ok) return { status: "error", message: g.state.message, seq };

  // An event ticket (scanned "JUKTI-TICKET:JT-…" or typed "JT-…"), a member card, or a typed member number.
  const ticket = /^(?:JUKTI-TICKET:)?(JT-[A-Z0-9]{6})$/i.exec(code)?.[1]?.toUpperCase();
  let memberId: string | null = null;
  if (!ticket) {
    memberId = verifyCardToken(code);
    if (!memberId && /^JKT-\d{2}-\d{4,}$/i.test(code)) {
      const { data } = await g.db.rpc("member_id_by_number", { p_member_no: code });
      memberId = (data as string | null) ?? null;
    }
    if (!memberId) return { status: "error", message: code.startsWith("JUKTI-MEMBER:") ? "That card’s code isn’t valid." : "Not a ticket or member card. Check the code.", seq };
  }

  const { data, error } = ticket
    ? await g.db.rpc("scan_ticket", { p_ticket_code: ticket, p_event_id: eventId, p_station_id: stationId })
    : await g.db.rpc("scan_at_event", { p_member_id: memberId, p_event_id: eventId, p_station_id: stationId });
  if (error) return { status: "error", message: explainDbError(error.message), seq };
  const row = (data as { outcome: ScanOutcome; name: string | null; member_no: string | null; photo_url: string | null; member_status: string | null; at: string | null; also_checked_in: boolean }[])[0];
  if (!row || row.outcome === "unknown_member") return { status: "error", message: "No member found. Check the card or the number.", seq };
  if (row.outcome === "unknown_ticket") return { status: "error", message: "No such ticket. Check the code.", seq };
  if (row.outcome === "wrong_station") return { status: "error", message: "That station isn’t part of this event. Reload the page.", seq };

  const name = row.name ?? "This member";
  const time = row.at ? dhakaTime.format(new Date(row.at)) : "";
  const messages: Record<ScanOutcome, string> = {
    checked_in: `${name} checked in.`,
    already_checked_in: `${name} already checked in at ${time}.`,
    served: `${name}: ${stationName} done.`,
    already_served: `${name} already had ${stationName} at ${time}.`,
    no_rsvp: `${name} hasn’t RSVPed to this event.`,
    waitlisted: `${name} is on the waitlist, not confirmed.`,
    unpaid: `${name} hasn’t paid the fee yet (or it isn’t confirmed). Check their payment under RSVPs.`,
    wrong_event: `This ticket is for a different event.`,
    unknown_ticket: "",
    cancelled: `${name} cancelled their RSVP.`,
    unknown_member: "",
    wrong_station: "",
  };
  if (row.outcome === "checked_in" || row.outcome === "served") refresh();
  return {
    status: "ok",
    // Guests (no member number) show their ticket code instead.
    person: { name, memberNo: row.member_no ?? ticket ?? null, photoUrl: row.photo_url, memberStatus: row.member_status ?? "approved" },
    outcome: row.outcome,
    at: row.at,
    alsoCheckedIn: row.also_checked_in,
    message: messages[row.outcome],
    seq,
  };
}

/* ---------- Event stations (Lunch, Snacks…) ---------- */

export async function addStation(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const name = str(fd, "name");
  if (name.length < 1 || name.length > 40) return failed("Name the station, e.g. Lunch.", { name: "1–40 characters." });
  const eventId = str(fd, "eventId");
  const { count } = await g.db.from("event_stations").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const { error } = await g.db.from("event_stations").insert({ event_id: eventId, name, position: count ?? 0 });
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, `Added ${name}.`);
}

export async function removeStation(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const { error } = await g.db.from("event_stations").delete().eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, "Removed.");
}

/** Mark someone at a station by hand (no member card), or undo a mistaken scan. */
export async function markStation(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("events");
  if (!g.ok) return g.state;
  const stationId = str(fd, "stationId");
  const registrationId = str(fd, "registrationId");
  const done = str(fd, "done") === "true";
  const { error } = done
    ? await g.db.from("station_scans").upsert({ station_id: stationId, registration_id: registrationId, scanned_by: g.admin.email }, { onConflict: "station_id,registration_id", ignoreDuplicates: true })
    : await g.db.from("station_scans").delete().eq("station_id", stationId).eq("registration_id", registrationId);
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, done ? "Marked." : "Undone.");
}

/* ---------- Executive codes ---------- */

const CODE = /^[A-Za-z0-9._-]{2,40}$/;

/** Add a code, or rename / switch on and off an existing one. The code itself doesn't change (members' registrations refer to it). */
export async function saveExecutive(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const code = str(fd, "code");
  const name = str(fd, "name");
  if (!CODE.test(code)) return failed("Codes are 2–40 letters, numbers, dots, dashes or underscores.", { code: "Check the code." });
  if (name.length < 2 || name.length > 80) return failed("Enter the executive’s name.", { name: "Enter their name." });
  const { error } = await g.db.from("executives").upsert({ code, name, active: fd.get("active") !== "off" }, { onConflict: "code" });
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, `Saved ${code}.`);
}

export async function setExecutiveActive(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const active = str(fd, "active") === "true";
  const { error } = await g.db.from("executives").update({ active }).eq("code", str(fd, "code"));
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, active ? "Switched on." : "Switched off: new registrations can’t use it.");
}

/* ---------- Opening and closing registration ---------- */

/** Open or close registration on /join. While closed, /join says we're not recruiting this semester. */
export async function setRegistrationOpen(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const open = str(fd, "open") === "true";
  const { error } = await g.db.from("site_settings").upsert({ key: "members.registration", value: { open } });
  if (error) return failed(explainDbError(error.message));
  updateTag(SETTINGS_TAG);
  refresh();
  return ok(previous, open ? "Registration is open." : "Registration is closed.");
}

/** Turn the executive's code on /join on or off (Admin > Members). */
export async function setExecutiveCodeRequired(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const required = str(fd, "required") === "true";
  const { error } = await g.db.from("site_settings").upsert({ key: "members.verification", value: { required } });
  if (error) return failed(explainDbError(error.message));
  updateTag(SETTINGS_TAG);
  refresh();
  return ok(previous, required ? "The executive code is required." : "No executive code needed.");
}

/* ---------- Moderating what members show publicly ---------- */

/** Fix a member's name or department, take them off the public list or directory, or remove their photo or bio. */
export async function moderateMember(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const removePhoto = fd.get("remove_photo") === "on";
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 80) return failed("Enter their full name.", { name: "2–80 characters." });
  const { error } = await g.db.rpc("moderate_member", {
    p_id: id,
    p: {
      name,
      department: str(fd, "department"),
      hide_from_public: fd.get("hide_from_public") === "on",
      show_in_directory: fd.get("show_in_directory") === "on",
      remove_photo: removePhoto,
      clear_bio: fd.get("clear_bio") === "on",
    },
  });
  if (error) return failed(error.message.includes("invalid_name") ? "Enter their full name." : explainDbError(error.message));
  // The photo file too, not just the link to it.
  if (removePhoto) await g.db.storage.from("avatars").remove([`${id}/photo.webp`]);
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, "Saved.");
}

/* ---------- Imported members (not signed in yet) ---------- */

export async function updateImport(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 80) return failed("Enter their full name.", { name: "2–80 characters." });
  const { error } = await g.db
    .from("member_imports")
    .update({ name, department: str(fd, "department") || null, hide_from_public: fd.get("hide_from_public") === "on" })
    .eq("email", str(fd, "email"));
  if (error) return failed(explainDbError(error.message));
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, "Saved.");
}

export async function setImportHidden(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const hidden = str(fd, "hidden") === "true";
  const { error } = await g.db.from("member_imports").update({ hide_from_public: hidden }).eq("email", str(fd, "email"));
  if (error) return failed(explainDbError(error.message));
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, hidden ? "Hidden from the public list." : "Shown on the public list.");
}

/** Remove a wrong or duplicate imported entry (only while they haven't signed in). */
export async function removeImport(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("members");
  if (!g.ok) return g.state;
  const { error, count } = await g.db.from("member_imports").delete({ count: "exact" }).eq("email", str(fd, "email"));
  if (error) return failed(explainDbError(error.message));
  if (!count) return failed("Couldn’t remove it. They may have signed in already.");
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, "Removed.");
}
