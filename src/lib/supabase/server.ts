import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./config";

function env() {
  if (!supabaseEnv) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return supabaseEnv;
}

/**
 * A client acting as the current visitor, from their session cookies. Request-time
 * only: create one per request, never inside "use cache".
 */
export async function createSessionClient() {
  const { url, key } = env();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}

/** A client with no session, for public reads that are cached and shared by everyone. */
export function createPublicClient() {
  const { url, key } = env();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
