import "server-only";
import { site } from "@/lib/site";

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Plain text as email HTML: escaped, with line breaks kept (Gmail ignores pre-wrap). */
export const textToHtml = (text: string) => escapeHtml(text).replace(/\r?\n/g, "<br>");

const dhakaTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });

/** "28 Sept 2026, 01:05 (Dhaka)" */
export const formatEmailTime = (date: Date) => `${dhakaTime.format(date)} (Dhaka)`;

type Layout = {
  /** Small orange line at the top, e.g. "New message · JUKTI website". */
  eyebrow: string;
  heading: string;
  /** Label/value rows under the heading; values are HTML. */
  rows?: [label: string, valueHtml: string][];
  /** The main text, as HTML, shown in the lava-edged box. */
  quoteHtml?: string;
  button?: { label: string; href: string };
  /** A closing line under everything, as HTML. */
  footerHtml?: string;
};

/**
 * The site's emails: dark, with a lava accent bar and the main text in a highlighted
 * box. Table layout and inline styles, so it holds up in Gmail and Outlook.
 */
export function emailLayout({ eyebrow, heading, rows = [], quoteHtml, button, footerHtml }: Layout) {
  const row = ([label, value]: [string, string]) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#9a918b;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;color:#ffffff;font-size:14px">${value}</td></tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#000000;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#120a07;border:1px solid #2a1a12;border-radius:16px">
      <tr><td style="height:4px;line-height:4px;font-size:0;background-color:#e0602c;background-image:linear-gradient(90deg,#c84a1a,#f57c48);border-radius:16px 16px 0 0">&nbsp;</td></tr>
      <tr><td style="padding:28px 28px 8px">
        <p style="margin:0;color:#f57c48;font-size:12px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3">${escapeHtml(heading)}</h1>
      </td></tr>
      ${rows.length ? `<tr><td style="padding:16px 28px 0"><table role="presentation" cellpadding="0" cellspacing="0">${rows.map(row).join("")}</table></td></tr>` : ""}
      ${quoteHtml ? `<tr><td style="padding:20px 28px 0"><div style="background:#0b0605;border:1px solid #2a1a12;border-left:3px solid #f57c48;border-radius:12px;padding:18px 20px;color:#e6e1dd;font-size:15px;line-height:1.65">${quoteHtml}</div></td></tr>` : ""}
      ${button ? `<tr><td style="padding:24px 28px 0"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#c84a1a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding:12px 22px;border-radius:999px">${escapeHtml(button.label)}</a></td></tr>` : ""}
      <tr><td style="padding:24px 28px 28px;color:#9a918b;font-size:13px;line-height:1.6">${footerHtml ?? escapeHtml(site.fullName)}</td></tr>
    </table>
  </body>
</html>`;
}
