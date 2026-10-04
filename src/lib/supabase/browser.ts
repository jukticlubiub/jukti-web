"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/** A client in the browser, signed in as the visitor (used for image uploads in the admin panel). */
export function createBrowserSupabase() {
  if (!supabaseEnv) throw new Error("Supabase is not configured.");
  return createBrowserClient(supabaseEnv.url, supabaseEnv.key);
}
