import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import { baseOpenGraph, siteTitle } from "@/lib/seo";
import { site } from "@/lib/site";
import { bodyFont, displayFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: siteTitle,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  category: "education",
  openGraph: baseOpenGraph,
  twitter: { card: "summary_large_image" },
  // Google Search Console's "HTML tag" check, if the site is verified that way: set the code from the tag.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#151515",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
