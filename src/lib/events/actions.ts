"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { EVENTS_TAG, getEventById } from "./queries";
import { getRsvpState, previewCancel, previewRegister, rsvpMode, type RsvpState } from "./rsvp";

export type RsvpField = "name" | "studentId" | "email";

export type RsvpFormState = {
  state: RsvpState;
  /** What the visitor typed, so a rejected form keeps it. */
  values?: Partial<Record<RsvpField, string>>;
  fieldErrors?: Partial<Record<RsvpField, string>>;
  error?: string;
  /** What just happened, for the confirmation message. */
  done?: "registered" | "waitlisted" | "cancelled";
};

const details = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  studentId: z
    .string()
    .trim()
    .regex(/^\d{7}$/, "Your IUB student ID is 7 digits."),
});
const previewDetails = details.extend({
  email: z.email("Enter a valid email address."),
});

// Errors raised by register_for_event() / cancel_event_registration().
const serverErrors: Record<string, string> = {
  not_authenticated: "Your session has expired. Sign in again to RSVP.",
  invalid_name: "Enter your full name.",
  invalid_student_id: "Your IUB student ID is 7 digits.",
  event_not_found: "This event isn't available any more.",
  rsvp_not_enabled: "This event doesn't take RSVPs.",
  rsvp_closed: "RSVPs for this event have closed.",
  event_over: "This event is over, so the RSVP can't be changed.",
};

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

  if (mode === "preview") {
    await previewRegister(event, { name: parsed.data.name, studentId: parsed.data.studentId, email: values.email.trim() });
  } else {
    const supabase = await createSessionClient();
    const { error } = await supabase.rpc("register_for_event", {
      p_event_id: event.id,
      p_full_name: parsed.data.name,
      p_student_id: parsed.data.studentId,
    });
    if (error) return fresh({ values, error: explain(error.message) });
    updateTag(EVENTS_TAG);
  }

  const next = await fresh();
  return { ...next, done: next.state.registration?.status };
}
