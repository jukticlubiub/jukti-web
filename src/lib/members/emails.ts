import "server-only";
import { deliver } from "@/lib/mail/deliver";
import { emailLayout, escapeHtml, textToHtml } from "@/lib/mail/layout";
import { site } from "@/lib/site";

type Reviewed = { name: string; email: string; secondaryEmail: string | null; memberNo: string | null; note: string | null };

/** To their IUB address and their personal one, so it arrives after graduation too. */
const recipients = (m: Reviewed) => [m.email, ...(m.secondaryEmail ? [m.secondaryEmail] : [])];

export async function emailMemberApproved(m: Reviewed) {
  const url = `${site.url}/account/card`;
  const text = [
    `Hi ${m.name},`,
    "",
    `Welcome to ${site.name}! Your membership is approved${m.memberNo ? ` and your member number is ${m.memberNo}` : ""}.`,
    "Your member card (with a QR code for event check-in) is on your account:",
    url,
    "",
    `— ${site.fullName}`,
  ].join("\n");
  const html = emailLayout({
    eyebrow: `Membership · ${site.name}`,
    heading: `Welcome to ${site.name}, ${m.name}`,
    rows: m.memberNo ? [["Member number", escapeHtml(m.memberNo)]] : [],
    quoteHtml: "Your membership is approved. Show the QR code on your member card at events to check in quickly.",
    button: { label: "Open your member card", href: url },
  });
  await deliver({ to: recipients(m), subject: `Welcome to ${site.name}: your membership is approved`, text, html });
}

export async function emailMemberNeedsAttention(m: Reviewed) {
  const url = `${site.url}/account`;
  const text = [
    `Hi ${m.name},`,
    "",
    `We couldn't approve your ${site.name} membership yet:`,
    m.note ?? "",
    "",
    `You can correct your details here, and we'll check again: ${url}`,
    "",
    `— ${site.fullName}`,
  ].join("\n");
  const html = emailLayout({
    eyebrow: `Membership · ${site.name}`,
    heading: "Your registration needs attention",
    quoteHtml: textToHtml(m.note ?? ""),
    button: { label: "Update your registration", href: url },
    footerHtml: `Questions? Reply to this email or talk to any ${escapeHtml(site.name)} executive.`,
  });
  await deliver({ to: recipients(m), subject: `Your ${site.name} registration needs attention`, text, html });
}
