"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { EVENTS_TAG, getEventById } from "./queries";
import { emailRsvpConfirmation } from "./emails";
import { getRsvpState, previewCancel, previewPay, previewRegister, rsvpMode, type RsvpState } from "./rsvp";

export type RsvpField = "name" | "studentId" | "email" | "sender" | "txn";

export type RsvpFormState = {
  state: RsvpState;
  /** What the visitor typed, so a rejected form keeps it. */
  values?: Partial<Record<RsvpField, string>>;
  fieldErrors?: Partial<Record<RsvpField, string>>;
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
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as RsvpField] ??= issue.message;
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

  const values = {
    name: String(formData.get("name") ?? ""),
    studentId: String(formData.get("studentId") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = (mode === "preview" ? previewDetails : details).safeParse(values);
  if (!parsed.success) {
    const fieldErrors: RsvpFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as RsvpField;
      fieldErrors[field] ??= issue.message;
    }
    return { state: previous.state, values, fieldErrors };
  }

  let isNew = true;
  if (mode === "preview") {
    isNew = !previous.state.registration;
    await previewRegister(event, { name: parsed.data.name, studentId: parsed.data.studentId, email: values.email.trim() });
  } else {
    const supabase = await createSessionClient();
    // Only a new RSVP gets the confirmation email (not updating your details).
    const { data: before } = await supabase.rpc("my_event_registration", { p_event_id: event.id });
    isNew = !before;
    const { error } = await supabase.rpc("register_for_event", {
      p_event_id: event.id,
      p_full_name: parsed.data.name,
      p_student_id: parsed.data.studentId,
    });
    if (error) return fresh({ values, error: explain(error.message) });
    updateTag(EVENTS_TAG);
  }

  const next = await fresh();
  const rsvp = next.state.registration;
  const email = mode === "preview" ? values.email.trim() : next.state.viewer?.email;
  if (isNew && rsvp?.ticketCode && email) {
    const to = { email, name: parsed.data.name };
    const ticket = { status: rsvp.status, position: rsvp.position, ticketCode: rsvp.ticketCode };
    after(() => emailRsvpConfirmation(event, to, ticket).catch((e) => console.error("RSVP email failed:", e)));
  }
  return { ...next, done: rsvp?.status };
}
