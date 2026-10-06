import QRCode from "qrcode";

/** Ticket codes: "JT-" and 6 characters without look-alikes. */
const TICKET = /^JT-[2-9A-HJKMNP-Z]{6}$/;

/**
 * A ticket's QR code as a PNG, for emails and the event page. It only encodes the code
 * itself (which the attendee already has), so it's public and cached.
 */
export async function GET(_request: Request, ctx: RouteContext<"/tickets/[code]/qr.png">) {
  const { code } = await ctx.params;
  const ticket = decodeURIComponent(code).toUpperCase();
  if (!TICKET.test(ticket)) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`JUKTI-TICKET:${ticket}`, { type: "png", margin: 1, scale: 8, errorCorrectionLevel: "M", color: { dark: "#140d0a", light: "#ffffff" } });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
