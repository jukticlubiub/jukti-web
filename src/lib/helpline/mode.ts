import { supabaseEnv } from "@/lib/supabase/config";

/**
 * live: questions and answers are stored in Supabase; asking and answering need a Google sign-in.
 * preview: no Supabase yet, in development. Posts are kept in memory on the dev server,
 *   so the whole flow can be tried out (they're gone after a restart). Never used in production.
 * off: no Supabase in production. The sample board is shown and posting isn't open.
 */
export type HelplineMode = "live" | "preview" | "off";

export function helplineMode(): HelplineMode {
  if (supabaseEnv) return "live";
  return process.env.NODE_ENV === "development" ? "preview" : "off";
}
