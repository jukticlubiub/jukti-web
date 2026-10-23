import type { NextConfig } from "next";

// Read when the server starts: restart `next dev` after changing NEXT_PUBLIC_SUPABASE_URL.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// PostHog (site analytics) is reached through this site's own /ingest path, so ad blockers and
// network filters that block posthog.com don't hide visitors. "eu" keeps the data in the EU.
// Read at build time, like NEXT_PUBLIC_POSTHOG_REGION in components/analytics/SiteAnalytics.tsx.
const posthogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

const nextConfig: NextConfig = {
  // Pages ship a prerendered shell; request-time parts (like which events are on
  // now, or a visitor's RSVP) stream in behind <Suspense>. See lib/events/queries.ts.
  cacheComponents: true,
  // Next's development badge, out of the bottom-left corner (where the Contact us button sits).
  devIndicators: { position: "bottom-right" },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `https://${posthogRegion}-assets.i.posthog.com/static/:path*` },
      { source: "/ingest/:path*", destination: `https://${posthogRegion}.i.posthog.com/:path*` },
    ];
  },
  images: {
    // Images uploaded in the admin panel (team portraits, event covers, galleries...) live in Supabase Storage.
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
};

export default nextConfig;
