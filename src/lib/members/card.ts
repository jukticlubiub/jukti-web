import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

/**
 * Member cards carry a QR code that Event Managers scan at the door. It holds the
 * member's id and a signature (HMAC with MEMBER_CARD_SECRET), so a code can't be made up
 * from someone's id. Without the secret in production, cards show no QR code and scans
 * are refused; development uses a fixed secret.
 */
const PREFIX = "JUKTI-MEMBER:";

function secret() {
  const value = process.env.MEMBER_CARD_SECRET;
  if (value && value.length >= 16) return value;
  return process.env.NODE_ENV === "development" ? "development-only-member-card-secret" : null;
}

function sign(memberId: string, key: string) {
  return createHmac("sha256", key).update(`member:${memberId}`).digest("base64url").slice(0, 22);
}

/** The text in a member's QR code, or null when cards can't be signed. */
export function cardToken(memberId: string) {
  const key = secret();
  return key ? `${PREFIX}${memberId}.${sign(memberId, key)}` : null;
}

/** The member id in a scanned code, if its signature is right. */
export function verifyCardToken(scanned: string): string | null {
  const key = secret();
  const match = new RegExp(`^${PREFIX}([0-9a-f-]{36})\\.([A-Za-z0-9_-]{22})$`, "i").exec(scanned.trim());
  if (!key || !match) return null;
  const [, id, signature] = match;
  const expected = Buffer.from(sign(id.toLowerCase(), key));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id.toLowerCase() : null;
}

/** The QR code as an SVG string (dark modules on transparent). */
export async function qrSvg(text: string, color = "#140d0a") {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: color, light: "#0000" } });
}
