"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/server";

/** Only redirect back to a path on this site. */
function safePath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/**
 * Sends the visitor to Google, then back to `next` through /auth/callback. With `hd`
 * (e.g. "iub.edu.bd") Google offers that domain's accounts first; the account chooser is
 * always shown, so someone signed in to several Google accounts can pick the right one.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safePath(formData.get("next"));
  const hd = formData.get("hd") === "iub.edu.bd" ? "iub.edu.bd" : null;
  const origin = (await headers()).get("origin") ?? site.url;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account", ...(hd ? { hd } : {}) },
    },
  });
  if (error || !data.url) {
    const back = new URL(next, site.url);
    back.searchParams.set("signin", "failed");
    redirect(`${back.pathname}${back.search}${back.hash}`);
  }
  redirect(data.url);
}

export async function signOut(formData: FormData) {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect(safePath(formData.get("next")));
}
