import { Inter_Tight, Michroma, Noto_Sans_Bengali } from "next/font/google";

/*
 * The design uses Microgramma D Extended (headings) and Neue Montreal (body).
 * Both need paid web licenses, so these free look-alikes stand in for now.
 *
 * To switch to the licensed fonts: put the woff2 files in src/app/fonts/, replace
 * these two calls with `localFont({ src: [...], variable: ... })` from "next/font/local"
 * keeping the same `variable` names, and set `--display-stroke` to 0 in globals.css
 * (the stroke only fakes the Bold weight Michroma doesn't have).
 */

export const displayFont = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
  display: "swap",
});

export const bodyFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

/** For Bengali text (যুক্তি), so it looks the same on every device. Only loaded where used. */
export const banglaFont = Noto_Sans_Bengali({
  weight: "600",
  subsets: ["bengali"],
  display: "swap",
});
