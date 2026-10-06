import "server-only";
import { deliver } from "@/lib/mail/deliver";
import { emailLayout, escapeHtml } from "@/lib/mail/layout";
import { bkashNumber as clubBkash } from "@/lib/members/options";
import { site } from "@/lib/site";
import { eventPath } from "./calendar";
import { formatDay, formatTime } from "./time";
import type { JuktiEvent } from "./types";

/** The ticket's QR code as an image link (email apps don't show embedded images). */
export const ticketQrUrl = (code: string) => `${site.url}/tickets/${encodeURIComponent(code)}/qr.png`;

type Attendee = { email: string; name: string };

/** Sent when someone RSVPs: their ticket code and QR code, and how to pay if there's a fee. */
export async function emailRsvpConfirmation(
  event: JuktiEvent,
  to: Attendee,
  rsvp: { status: "registered" | "waitlisted"; position: number | null; ticketCode: string },
) {
  const url = `${site.url}${eventPath(event.slug)}#rsvp`;
  const when = `${formatDay(event.startsAt)}, ${formatTime(event.startsAt)}`;
  const confirmed = rsvp.status === "registered";
  const fee = event.fee;
  const payTo = fee?.bkashNumber || clubBkash;

  const lines = [
    `Hi ${to.name},`,
    "",
    confirmed ? `You're registered for ${event.title}.` : `You're number ${rsvp.position ?? "?"} on the waitlist for ${event.title}. If a seat frees up, it's yours automatically.`,
    `${when} · ${event.venue}`,
    "",
    `Your ticket code: ${rsvp.ticketCode}`,
    "Show the QR code (on the event page or in this email) at the entry.",
    ...(fee && confirmed
      ? ["", `Registration fee: ৳${fee.amount}. Send it by bKash to ${payTo} (personal) with ${rsvp.ticketCode} as the reference, then enter your bKash number on the event page: ${url}`, ...(fee.note ? [fee.note] : [])]
      : []),
    "",
    url,
    "",
    `— ${site.fullName}`,
  ];

  const html = emailLayout({
    eyebrow: `${confirmed ? "Registered" : "Waitlist"} · ${site.name}`,
    heading: confirmed ? `You’re in: ${event.title}` : `You’re on the waitlist: ${event.title}`,
    rows: [
      ["When", escapeHtml(when)],
      ["Where", escapeHtml(event.venue || "TBA")],
      ["Ticket", `<strong style="font-size:18px;letter-spacing:2px">${escapeHtml(rsvp.ticketCode)}</strong>`],
      ...(!confirmed ? [["Place in line", `#${rsvp.position ?? "?"}`] as [string, string]] : []),
      ...(fee && confirmed ? [["Fee", `৳${fee.amount}: not paid yet`] as [string, string]] : []),
    ],
    quoteHtml:
      `<div style="text-align:center"><img src="${escapeHtml(ticketQrUrl(rsvp.ticketCode))}" width="200" height="200" alt="QR code for ticket ${escapeHtml(rsvp.ticketCode)}" style="background:#ffffff;padding:12px;border-radius:12px" /></div>` +
      `<p style="margin:14px 0 0;text-align:center">Show this at the entry. If it doesn’t load, give them the code <strong>${escapeHtml(rsvp.ticketCode)}</strong>.</p>` +
      (fee && confirmed
        ? `<p style="margin:14px 0 0">Send <strong>৳${fee.amount}</strong> by bKash to <strong>${escapeHtml(payTo)}</strong> (personal) with <strong>${escapeHtml(rsvp.ticketCode)}</strong> as the reference, then enter your bKash number on the event page. Your ticket works at the entry once we’ve confirmed the payment.${fee.note ? `<br><br>${escapeHtml(fee.note)}` : ""}</p>`
        : ""),
    button: { label: fee && confirmed ? "Pay and see your ticket" : "See your ticket", href: url },
  });

  await deliver({
    to: to.email,
    subject: confirmed ? `Your ticket for ${event.title} (${rsvp.ticketCode})` : `Waitlist: ${event.title}`,
    text: lines.join("\n"),
    html,
  });
}

/** Sent when an Event Manager confirms someone's fee. */
export async function emailPaymentConfirmed(event: JuktiEvent, to: Attendee, ticketCode: string) {
  const url = `${site.url}${eventPath(event.slug)}#rsvp`;
  const when = `${formatDay(event.startsAt)}, ${formatTime(event.startsAt)}`;
  const html = emailLayout({
    eyebrow: `Payment confirmed · ${site.name}`,
    heading: `You’re all set for ${event.title}`,
    rows: [
      ["When", escapeHtml(when)],
      ["Ticket", `<strong style="font-size:18px;letter-spacing:2px">${escapeHtml(ticketCode)}</strong>`],
    ],
    quoteHtml: `<div style="text-align:center"><img src="${escapeHtml(ticketQrUrl(ticketCode))}" width="200" height="200" alt="QR code for ticket ${escapeHtml(ticketCode)}" style="background:#ffffff;padding:12px;border-radius:12px" /></div><p style="margin:14px 0 0;text-align:center">We’ve received your payment. Show this QR code at the entry.</p>`,
    button: { label: "See your ticket", href: url },
  });
  await deliver({
    to: to.email,
    subject: `Payment confirmed: ${event.title}`,
    text: [`Hi ${to.name},`, "", `We've received your payment for ${event.title} (${when}).`, `Your ticket: ${ticketCode}. Show the QR code at the entry: ${url}`, "", `— ${site.fullName}`].join("\n"),
    html,
  });
}
