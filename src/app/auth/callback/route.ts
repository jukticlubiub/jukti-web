import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

/** Google sends visitors back here after sign-in. Trade the code for a session, then return. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const code = searchParams.get("code");

  if (supabaseEnv && code) {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Skip the /join ⇄ /account bounce: /join redirects members to /account and /account
      // redirects non-members to /join, so a sign-in through either would load twice (a blank
      // flash on the way back from Google). Send them straight to the right one.
      let dest = next;
      const uid = data.session?.user?.id;
      if (uid && (next === "/join" || next === "/account")) {
        const { data: member } = await supabase.from("members").select("id").eq("id", uid).maybeSingle();
        dest = member ? "/account" : "/join";
      }
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  const failed = new URL(next, origin);
  failed.searchParams.set("signin", "failed");
  return NextResponse.redirect(failed);
}
