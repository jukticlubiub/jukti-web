import type { Metadata } from "next";
import { site } from "./site";

export const siteTitle = `${site.name} · Club of CSE, IUB`;

/** The site's default share picture (app/opengraph-image.tsx), for pages without their own. */
export const defaultShareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "JUKTI, Club of CSE, IUB: the largest CSE student community at Independent University, Bangladesh",
};

/** Open Graph fields every page shares. A page's own `openGraph` replaces the layout's entirely, so pages start from these. */
export const baseOpenGraph = { siteName: site.fullName, locale: "en_US", type: "website" } as const;

/**
 * Metadata for a public page: title and description, its canonical address (so search
 * engines treat ?query variants as the same page), and how it looks when shared. Without
 * `image`, the shared card uses the site's default picture. (A page that sets its own
 * openGraph loses the layout's image, so it's always set here.)
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title?: string;
  description: string;
  path: string;
  image?: { url: string; alt?: string };
  type?: "website" | "article";
}): Metadata {
  const shareTitle = title ? `${title} · ${site.name}` : siteTitle;
  const images = [image ?? defaultShareImage];
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, type, url: path, title: shareTitle, description, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
  };
}
