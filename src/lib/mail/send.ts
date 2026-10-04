import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/*
 * Sending email. The first configured service is used:
 *   1. The club's Gmail: GMAIL_USER and GMAIL_APP_PASSWORD (an app password, which
 *      needs 2-Step Verification on the account). Sends as that address to anyone,
 *      about 500 emails a day.
 *   2. Resend: RESEND_API_KEY (and CONTACT_FROM_EMAIL once a domain is verified).
 *   3. Nothing, in development: the email is printed in the terminal instead.
 */

export type Mail = {
  to: string | string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

type Sent = "gmail" | "resend" | "logged";

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

let gmail: Transporter | null = null;

/** Whether real email can be sent (or, in development, logged instead). */
export function canSendMail() {
  return Boolean((gmailUser && gmailPassword) || process.env.RESEND_API_KEY || process.env.NODE_ENV === "development");
}

export async function sendMail(mail: Mail): Promise<Sent> {
  if (gmailUser && gmailPassword) {
    gmail ??= createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPassword } });
    await gmail.sendMail({
      from: { name: "JUKTI", address: gmailUser },
      to: mail.to,
      bcc: mail.bcc,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return "gmail";
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        // Retries of the same send never deliver twice.
        "Idempotency-Key": `mail-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "JUKTI Website <onboarding@resend.dev>",
        to: Array.isArray(mail.to) ? mail.to : [mail.to],
        bcc: mail.bcc?.length ? mail.bcc : undefined,
        reply_to: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!response.ok) throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
    return "resend";
  }

  if (process.env.NODE_ENV === "development") {
    const bcc = mail.bcc?.length ? `\nBcc: ${mail.bcc.join(", ")}` : "";
    console.info(`\n[mail] No email service is set up, so this wasn't sent:\n\nTo: ${[mail.to].flat().join(", ")}${bcc}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return "logged";
  }

  throw new Error("No email service is configured (set GMAIL_USER and GMAIL_APP_PASSWORD).");
}
