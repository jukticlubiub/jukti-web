import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/config";

/**
 * Keeps the visitor's Supabase session fresh: an expired access token is refreshed
 * here and the new cookies are written to both the request (for this render) and
 * the response (for the browser). Runs only on routes that read the session.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseEnv) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  // Verifies the session and refreshes it if needed.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/events/:path*", "/helpline/:path*", "/admin/:path*", "/auth/:path*"],
};
