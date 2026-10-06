import "server-only";
import { site } from "@/lib/site";
import { type Mail, sendMail } from "./send";

/** The club inbox. */
export const clubInbox = () => process.env.CONTACT_TO_EMAIL || site.socials.email;

/**
 * Only the production site emails faculty, students and members. Anywhere else (local
 * development, Vercel preview deployments) every such email goes to the club inbox
 * instead, marked as a test, so trying things out never emails real people.
 */
const deliversForReal = process.env.NODE_ENV === "production" && (process.env.VERCEL_ENV ?? "production") === "production";

function describe(addresses: string[]) {
  if (addresses.length <= 3) return addresses.join(", ");
  return `${addresses.slice(0, 2).join(", ")} and ${addresses.length - 2} others`;
}

/** Sends an email to people outside the club (or, outside production, to the club inbox as a test). */
export async function deliver(mail: Mail) {
  if (deliversForReal) return sendMail(mail);
  const intended = [...[mail.to].flat(), ...(mail.bcc ?? [])];
  return sendMail({
    ...mail,
    to: clubInbox(),
    bcc: undefined,
    subject: `[Test] ${mail.subject}`,
    text: `Test email. On the live site this goes to: ${describe(intended)}.\n\n${mail.text}`,
  });
}
