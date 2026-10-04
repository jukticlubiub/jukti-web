import type { NextConfig } from "next";

// Read when the server starts: restart `next dev` after changing NEXT_PUBLIC_SUPABASE_URL.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Pages ship a prerendered shell; request-time parts (like which events are on
  // now, or a visitor's RSVP) stream in behind <Suspense>. See lib/events/queries.ts.
  cacheComponents: true,
  images: {
    // Images uploaded in the admin panel (team portraits, event covers, galleries...) live in Supabase Storage.
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
};

export default nextConfig;
