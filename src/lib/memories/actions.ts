"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { emailLayout, escapeHtml, formatEmailTime, textToHtml } from "@/lib/mail/layout";
import { sendMail } from "@/lib/mail/send";
import { site } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { MEMORIES_TAG, previewMemories } from "./queries";
import { type MemoryField, type MemoryFormState, memoryLimits as limits, type MemoryRelation, memoryRelations } from "./types";

// A few memories per sender per hour (per server instance), against scripted spam.
const RATE_LIMIT = { max: 3, windowMs: 60 * 60 * 1000 };
const recentBySender = new Map<string, number[]>();

function rateLimited(sender: string) {
  const now = Date.now();
  const recent = (recentBySender.get(sender) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  const limited = recent.length >= RATE_LIMIT.max;
  if (!limited) recent.push(now);
  recentBySender.set(sender, recent);
  return limited;
}

const relationValues = memoryRelations.map((r) => r.value) as [MemoryRelation, ...MemoryRelation[]];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(limits.name, "That name is too long."),
  relation: z.enum(relationValues, "Choose how you knew him."),
  affiliation: z.string().trim().max(limits.affiliation, "Keep this short, e.g. CSE, 2012."),
  message: z
    .string()
    .trim()
    .min(limits.message.min, `Share a little more (at least ${limits.message.min} characters).`)
    .max(limits.message.max, `Keep it under ${limits.message.max.toLocaleString("en-US")} characters.`)
    .refine((t) => !/https?:\/\//i.test(t), "Please leave out links."),
  email: z.union([z.literal(""), z.email("Enter a valid email address, or leave it empty.")]),
});

/** Saves a memory for review (or, in development without Supabase, shows it straight away). */
export async function shareMemory(_previous: MemoryFormState, formData: FormData): Promise<MemoryFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    relation: String(formData.get("relation") ?? ""),
    affiliation: String(formData.get("affiliation") ?? ""),
    message: String(formData.get("message") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
  };

  // Honeypot: hidden from people, filled in by bots. Pretend it worked.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent" };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: MemoryFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as MemoryField] ??= issue.message;
    return { status: "error", values, fieldErrors };
  }

  const h = await headers();
  const sender = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (rateLimited(sender)) {
    return { status: "error", values, error: "You’ve shared a few memories already. Please try again in an hour." };
  }

  const { name, relation, message } = parsed.data;
  const affiliation = parsed.data.affiliation || null;
  const email = parsed.data.email || null;

  if (supabaseEnv) {
    const { error } = await createPublicClient().from("sabbir_memories").insert({ name, relation, affiliation, message, email });
    if (error) {
      console.error("[memories] Couldn't save a memory:", error);
      return { status: "error", values, error: "Your memory couldn’t be saved just now. Please try again." };
    }
  } else if (process.env.NODE_ENV === "development") {
    previewMemories().push({ id: crypto.randomUUID(), name, relation, affiliation, message, sharedAt: new Date().toISOString() });
    updateTag(MEMORIES_TAG);
  } else {
    return { status: "error", values, error: `Sharing memories isn’t open yet. You can email us at ${site.socials.email}.` };
  }

  // Let the club know there's a memory to review (after the response, so it never waits on email).
  const relationLabel = memoryRelations.find((r) => r.value === relation)?.label ?? relation;
  const sentAt = new Date();
  after(async () => {
    try {
      const pageUrl = `${site.url}/about/dr-ali-shihab-sabbir#memories`;
      await sendMail({
        to: process.env.CONTACT_TO_EMAIL || site.socials.email,
        replyTo: email ?? undefined,
        subject: `[Website] A memory of Dr. Sabbir from ${name}`,
        text: [
          `${name} (${relationLabel}${affiliation ? `, ${affiliation}` : ""}) shared a memory of Dr. Ali Shihab Sabbir:`,
          "",
          message,
          "",
          supabaseEnv
            ? "It's waiting for review: in Supabase, open the sabbir_memories table and set its status to approved (and approved_at to now) to show it on the page, or hidden to leave it out."
            : "Preview mode: it's already on the page in development.",
          email ? `\nReply to this email to write back to ${name}.` : "",
          `\nMemorial page: ${pageUrl}`,
        ].join("\n"),
        html: emailLayout({
          eyebrow: "Memorial page · New memory",
          heading: `A memory from ${name}`,
          rows: [
            ["From", `${escapeHtml(name)} · ${escapeHtml(relationLabel)}${affiliation ? `, ${escapeHtml(affiliation)}` : ""}`],
            ...(email ? ([["Email", `<a href="mailto:${escapeHtml(email)}" style="color:#f57c48">${escapeHtml(email)}</a>`]] as [string, string][]) : []),
            ["Shared", escapeHtml(formatEmailTime(sentAt))],
          ],
          quoteHtml: textToHtml(message),
          button: { label: "Open the memorial page", href: pageUrl },
          footerHtml: supabaseEnv
            ? "Waiting for review: in Supabase, set its <b>status</b> to <b>approved</b> in the <b>sabbir_memories</b> table (and <b>approved_at</b> to now) to show it, or <b>hidden</b> to leave it out."
            : "Preview mode: it’s already on the page in development.",
        }),
      });
    } catch (error) {
      console.error("[memories] Couldn't email the club about a new memory:", error);
    }
  });

  return { status: "sent", preview: !supabaseEnv };
}
