"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { EVENTS_TAG, getEventById } from "./queries";
import { emailRsvpConfirmation } from "./emails";
import { getRsvpState, previewCancel, previewPay, previewRegister, rsvpMode, type RsvpState } from "./rsvp";
import { rsvpStandardFields } from "./types";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export type RsvpFormState = {
  state: RsvpState;
  /** What the visitor typed, so a rejected form keeps it. Keyed by field/question name. */
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  error?: string;
  /** What just happened, for the confirmation message. */
  done?: "registered" | "waitlisted" | "cancelled" | "paid";
};

const details = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  // Optional: guests from outside IUB leave it empty (signed in with an IUB student email, it's filled from that).
  studentId: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{7}$/.test(v), "Your IUB student ID is 7 digits (or leave it empty if you’re not at IUB)."),
});
const previewDetails = details.extend({
  email: z.email("Enter a valid email address."),
});

// Errors raised by register_for_event() / cancel_event_registration().
const serverErrors: Record<string, string> = {
  not_authenticated: "Your session has expired. Sign in again to RSVP.",
  iub_only: "This event is for IUB students. Sign in with your @iub.edu.bd account.",
  invalid_fields: "Some answers need fixing. Check the form and try again.",
  invalid_name: "Enter your full name.",
  invalid_student_id: "Your IUB student ID is 7 digits (or leave it empty if you’re not at IUB).",
  event_not_found: "This event isn't available any more.",
  rsvp_not_enabled: "This event doesn't take RSVPs.",
  rsvp_closed: "RSVPs for this event have closed.",
  event_over: "This event is over, so the RSVP can't be changed.",
  not_registered: "You're not registered for this event.",
  not_required: "This event doesn't have a fee.",
  already_paid: "Your payment is already confirmed.",
  invalid_payment: "Check your bKash number (and the transaction ID, if you added one).",
};

const payment = z.object({
  sender: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter the bKash number you paid from.")),
  txn: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z0-9]{8,12}$/.test(v), "A bKash transaction ID is 8–12 letters and numbers."),
});

function explain(message: string) {
  return serverErrors[message] ?? "Something went wrong. Please try again.";
}

/** Signs up or cancels, depending on the submit button's `intent`. */
export async function rsvpAction(previous: RsvpFormState, formData: FormData): Promise<RsvpFormState> {
  const event = await getEventById(String(formData.get("eventId") ?? ""));
  if (!event) return { state: previous.state, error: "This event isn't available any more." };

  const mode = rsvpMode();
  const fresh = async (extra: Omit<RsvpFormState, "state"> = {}) => ({ state: await getRsvpState(event), ...extra });

  if (mode === "off") return fresh({ error: "Online RSVP isn't open yet." });

  if (formData.get("intent") === "pay") {
    const values = { sender: String(formData.get("sender") ?? ""), txn: String(formData.get("txn") ?? "") };
    const parsed = payment.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: RsvpFormState["fieldErrors"] = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { state: previous.state, values, fieldErrors };
    }
    if (mode === "preview") {
      await previewPay(event, { sender: parsed.data.sender, txn: parsed.data.txn || null });
    } else {
      const supabase = await createSessionClient();
      const { error } = await supabase.rpc("submit_event_payment", { p_event_id: event.id, p_sender: parsed.data.sender, p_txn: parsed.data.txn || null });
      if (error) return fresh({ values, error: explain(error.message) });
    }
    return fresh({ done: "paid" });
  }

  if (formData.get("intent") === "cancel") {
    if (mode === "preview") {
      await previewCancel(event);
    } else {
      const supabase = await createSessionClient();
      const { error } = await supabase.rpc("cancel_event_registration", { p_event_id: event.id });
      if (error) return fresh({ error: explain(error.message) });
      updateTag(EVENTS_TAG);
    }
    return fresh({ done: "cancelled" });
  }

  const values: Record<string, string> = {
    name: String(formData.get("name") ?? ""),
    studentId: String(formData.get("studentId") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const base = (mode === "preview" ? previewDetails : details).safeParse(values);
  const fieldErrors: Record<string, string> = {};
  if (!base.success) for (const issue of base.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;

  // Standard optional fields and custom questions, per this event's RSVP config.
  const answers: Record<string, unknown> = {};
  const viewerEmail = previous.state.viewer?.email ?? "";
  const studentIdFromIub = /^[0-9]{7}@iub\.edu\.bd$/i.test(viewerEmail);
  if (event.rsvp.fields.student_id === "required" && !values.studentId.trim() && !studentIdFromIub) {
    fieldErrors.studentId ??= "Your IUB student ID is required for this event.";
  }
  for (const f of rsvpStandardFields) {
    if (f === "student_id") continue;
    const cfg = event.rsvp.fields[f];
    if (!cfg) continue;
    const raw = String(formData.get(f) ?? "").trim();
    values[f] = raw;
    if (!raw) {
      if (cfg === "required") fieldErrors[f] ??= "This is required.";
      continue;
    }
    if (f === "phone") {
      const digits = raw.replace(/[\s-]/g, "");
      if (!/^(\+?88)?01[3-9]\d{8}$/.test(digits)) fieldErrors[f] ??= "Enter a valid Bangladeshi mobile number.";
      else answers[f] = digits;
    } else if (f === "blood_group") {
      if (!BLOOD_GROUPS.includes(raw)) fieldErrors[f] ??= "Choose a blood group.";
      else answers[f] = raw;
    } else if (f === "facebook") {
      if (raw.length > 300 || !/^https:\/\/([a-z0-9-]+\.)?(facebook\.com|fb\.com)\//i.test(raw)) {
        fieldErrors[f] ??= "Paste your Facebook profile link (https://facebook.com/…).";
      } else answers[f] = raw;
    } else {
      answers[f] = raw.slice(0, 120);
    }
  }
  for (const q of event.rsvp.questions) {
    if (q.type === "checkbox") {
      const picked = formData.getAll(q.id).map(String).map((v) => v.trim()).filter((v) => q.options.includes(v));
      if (picked.length === 0) {
        if (q.required) fieldErrors[q.id] ??= "Please choose at least one.";
      } else {
        answers[q.id] = picked;
      }
    } else {
      const v = String(formData.get(q.id) ?? "").trim();
      values[q.id] = v;
      if (!v) {
        if (q.required) fieldErrors[q.id] ??= "This is required.";
      } else if (q.type === "select" && !q.options.includes(v)) {
        fieldErrors[q.id] ??= "Choose an option from the list.";
      } else {
        answers[q.id] = v.slice(0, 2000);
      }
    }
  }

  if (!base.success || Object.keys(fieldErrors).length > 0) {
    return { state: previous.state, values, fieldErrors };
  }

  let isNew = true;
  if (mode === "preview") {
    isNew = !previous.state.registration;
    await previewRegister(event, { name: base.data.name, studentId: base.data.studentId, email: values.email.trim() });
  } else {
    const supabase = await createSessionClient();
    // Only a new RSVP gets the confirmation email (not updating your details).
    const { data: before } = await supabase.rpc("my_event_registration", { p_event_id: event.id });
    isNew = !before;
    const { error } = await supabase.rpc("register_for_event", {
      p_event_id: event.id,
      p_full_name: base.data.name,
      p_student_id: base.data.studentId,
      p_answers: answers,
    });
    if (error) return fresh({ values, error: explain(error.message) });
    updateTag(EVENTS_TAG);
  }

  const next = await fresh();
  const rsvp = next.state.registration;
  const email = mode === "preview" ? values.email.trim() : next.state.viewer?.email;
  if (isNew && rsvp?.ticketCode && email) {
    const to = { email, name: base.data.name };
    const ticket = { status: rsvp.status, position: rsvp.position, ticketCode: rsvp.ticketCode };
    after(() => emailRsvpConfirmation(event, to, ticket).catch((e) => console.error("RSVP email failed:", e)));
  }
  return { ...next, done: rsvp?.status };
}
