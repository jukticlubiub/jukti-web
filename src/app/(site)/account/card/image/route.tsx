import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, MARK_PIECES, TAGLINE_PATHS, WORDMARK_PATHS } from "@/components/brand/logo-paths";
import { getAccount } from "@/lib/members/account";
import { cardToken, qrSvg } from "@/lib/members/card";
import { intakeLabel } from "@/lib/members/semester";

const W = 1200;
const H = 757;

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}" fill="#ffffff">${[...Object.values(MARK_PIECES), ...WORDMARK_PATHS, ...TAGLINE_PATHS]
  .map((d) => `<path d="${d}"/>`)
  .join("")}</svg>`;

/** The member card as a PNG, to save to a phone's photos. Approved members only. */
export async function GET() {
  const { user, member } = await getAccount();
  if (!user || !member || member.status !== "approved") return new Response("Not found", { status: 404 });
  const token = cardToken(member.id);
  if (!token) return new Response("Not available", { status: 404 });
  const qr = await qrSvg(token);
  const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const details = [member.department, intakeLabel(member.iubId)].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#ffffff",
          backgroundColor: "#0a0605",
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(200,74,26,0.55), rgba(200,74,26,0) 55%), radial-gradient(circle at 100% 100%, rgba(120,40,12,0.6), rgba(120,40,12,0) 60%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og */}
          <img src={svgData(logoSvg)} width={360} height={159} alt="" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 28, letterSpacing: 9, color: "#f57c48" }}>MEMBER</div>
            <div style={{ fontSize: 44, marginTop: 6 }}>{member.memberNo ?? ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 204,
                height: 204,
                borderRadius: 999,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#a83f13",
                fontSize: 80,
                border: "6px solid rgba(255,255,255,0.15)",
              }}
            >
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og
                <img src={member.photoUrl} width={204} height={204} alt="" style={{ objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 42, maxWidth: 520 }}>
              <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{member.name}</div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>{details}</div>
              <div style={{ fontSize: 30, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{`ID ${member.iubId}`}</div>
            </div>
          </div>
          <div style={{ display: "flex", width: 300, height: 300, padding: 24, backgroundColor: "#ffffff", borderRadius: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og */}
            <img src={svgData(qr)} width={252} height={252} alt="" />
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": "private, no-store" } },
  );
}
