import "server-only";
import { emailLayout, escapeHtml, formatEmailTime, textToHtml } from "@/lib/mail/layout";
import { site } from "@/lib/site";

type Message = { name: string; email: string; topic: string; message: string; sentAt: Date };

/** The email the club receives from the contact form. */
export function contactEmail({ name, email, topic, message, sentAt }: Message) {
  const when = formatEmailTime(sentAt);
  const subject = `[Website] ${topic}: ${name}`;

  const text = [
    `New message from the ${site.name} website`,
    "",
    `From: ${name} <${email}>`,
    `Topic: ${topic}`,
    `Sent: ${when}`,
    "",
    message,
    "",
    `Reply to this email to answer ${name} directly.`,
  ].join("\n");

  const html = emailLayout({
    eyebrow: `New message · ${site.name} website`,
    heading: topic,
    rows: [
      ["From", `${escapeHtml(name)} &lt;<a href="mailto:${escapeHtml(email)}" style="color:#f57c48">${escapeHtml(email)}</a>&gt;`],
      ["Sent", escapeHtml(when)],
    ],
    quoteHtml: textToHtml(message),
    footerHtml: `Reply to this email to answer ${escapeHtml(name)} directly.`,
  });

  return { subject, text, html };
}
