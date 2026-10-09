import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/*
 * The picture shown when a page of the site is shared (Facebook, WhatsApp, LinkedIn, X) and
 * no page-specific image exists: the JUKTI logo over the site's dark, lava-lit horizon.
 * Events and Jukti Logs posts use their own cover instead.
 */

export const alt = "JUKTI, Club of CSE, IUB: the largest CSE student community at Independent University, Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/jukti-logo.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0605",
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 50% 118%, rgba(245,124,72,0.75), rgba(200,74,26,0.35) 45%, rgba(11,6,5,0) 75%), linear-gradient(180deg, #171310 0%, #0b0605 70%)",
          color: "#f3ede8",
          fontFamily: "sans-serif",
        }}
      >
        <img src={logoSrc} width={452} height={200} alt="" />
        <div style={{ marginTop: 44, fontSize: 40, fontWeight: 600, letterSpacing: -0.5, display: "flex" }}>Club of Computer Science & Engineering</div>
        <div style={{ marginTop: 12, fontSize: 30, color: "#f57c48", display: "flex" }}>Independent University, Bangladesh · since 2014</div>
      </div>
    ),
    size,
  );
}
