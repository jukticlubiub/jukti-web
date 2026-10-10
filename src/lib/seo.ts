import type { Metadata } from "next";
import { site } from "./site";

export const siteTitle = `${site.name} · Club of CSE, IUB`;

/**
 * The site's default share picture (Facebook, Messenger, WhatsApp, LinkedIn, X), for pages
 * without their own: the Executive Board photo at 1200×630. To change it, add the new picture
 * under a new file name: Facebook keeps a picture cached by its address.
 */
export const defaultShareImage = {
  url: "/share/executive-board-2026-27.jpg",
  width: 1200,
  height: 630,
  alt: "JUKTI Executive Board 2026–27, Club of CSE, IUB",
};

/**
 * Open Graph fields every page shares. A page's own `openGraph` replaces the layout's entirely,
 * so pages start from these. `siteName` matches the WebSite structured data's name ("JUKTI"):
 * Google picks the site name shown in results from these, and they must agree.
 */
export const baseOpenGraph = { siteName: site.name, locale: "en_US", type: "website" } as const;

/**
 * Metadata for a public page: title and description, its canonical address (so search
 * engines treat ?query variants as the same page), and how it looks when shared. Without
 * `image`, the shared card uses the site's default picture. (A page that sets its own
 * openGraph loses the layout's image, so it's always set here.) `fullTitle` replaces the
 * whole title, without the " · JUKTI" ending (for the home page).
 */
export function pageMetadata({
  title,
  fullTitle,
  description,
  path,
  image,
  type = "website",
}: {
  title?: string;
  fullTitle?: string;
  description: string;
  path: string;
  image?: { url: string; alt?: string };
  type?: "website" | "article";
}): Metadata {
  const shareTitle = fullTitle ?? (title ? `${title} · ${site.name}` : siteTitle);
  const images = [image ?? defaultShareImage];
  return {
    ...(fullTitle ? { title: { absolute: fullTitle } } : title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, type, url: path, title: shareTitle, description, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
  };
}
