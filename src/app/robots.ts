import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** /robots.txt: everything public may be crawled; the admin panel and members' own pages may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/members", "/auth", "/tickets", "/styleguide"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
