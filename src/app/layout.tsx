import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import { site } from "@/lib/site";
import { bodyFont, displayFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · Club of CSE, IUB`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    siteName: site.fullName,
    type: "website",
  },
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
