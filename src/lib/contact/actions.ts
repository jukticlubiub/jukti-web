"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { site } from "@/lib/site";
import { canSendMail, sendMail } from "@/lib/mail/send";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { contactEmail } from "./email";
import { type ContactField, type ContactFormState, contactTopics, MESSAGE_MAX } from "./topics";

// Messages are emailed to the club (see lib/mail/send.ts for how email is sent).
// CONTACT_TO_EMAIL overrides where they go (default: the club address in lib/site.ts).

// A few messages per sender per window. Kept in memory, so it's per server instance:
// enough to stop a script hammering one instance. Add a CAPTCHA if spam gets through.
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const recentBySender = new Map<string, number[]>();

function rateLimited(sender: string) {
  const now = Date.now();
  const recent = (recentBySender.get(sender) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  const limited = recent.length >= RATE_LIMIT.max;
  if (!limited) recent.push(now);
  recentBySender.set(sender, recent);
  return limited;
}

const topicValues = contactTopics.map((t) => t.value) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "That name is too long."),
  email: z.email("Enter a valid email address, so we can reply.").max(200),
  topic: z.enum(topicValues, "Choose what your message is about."),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters).")
    .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX.toLocaleString("en-US")} characters.`)
    .refine((text) => (text.match(/https?:\/\//g) ?? []).length <= 3, "Please include no more than three links."),
});

export async function sendContactMessage(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    topic: String(formData.get("topic") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // The honeypot: a field people never see, which bots fill in. Pretend it worked.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent", replyTo: values.email };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField;
      fieldErrors[field] ??= issue.message;
    }
    return { status: "error", values, fieldErrors };
  }

  const requestHeaders = await headers();
  const sender = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (rateLimited(sender)) {
    return {
      status: "error",
      values,
      error: `You've sent a few messages already. Please wait a few minutes, or email us at ${site.socials.email}.`,
    };
  }

  const { name, email, message } = parsed.data;
  const topic = contactTopics.find((t) => t.value === parsed.data.topic)?.label ?? "General";
  const { subject, text, html } = contactEmail({ name, email, topic, message, sentAt: new Date() });

  // Kept in the admin panel's inbox too (when Supabase is connected), so nothing depends on email alone.
  let saved = false;
  if (supabaseEnv) {
    const { error } = await createPublicClient().from("contact_messages").insert({ name, email, topic: parsed.data.topic, message });
    if (error) console.error("[contact] The message couldn't be saved to the inbox:", error);
    else saved = true;
  }

  if (!canSendMail()) {
    if (saved) return { status: "sent", replyTo: email };
    return {
      status: "error",
      values,
      error: `The message form isn't set up yet. Please email us at ${site.socials.email}.`,
    };
  }

  try {
    const sent = await sendMail({ to: process.env.CONTACT_TO_EMAIL || site.socials.email, replyTo: email, subject, text, html });
    if (sent === "logged") return { status: "sent", preview: true, replyTo: email };
  } catch (error) {
    console.error("[contact] The message couldn't be sent:", error);
    if (saved) return { status: "sent", replyTo: email };
    return {
      status: "error",
      values,
      error: `Your message couldn't be sent just now. Please try again, or email us at ${site.socials.email}.`,
    };
  }

  return { status: "sent", replyTo: email };
}
