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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Skip the /join ⇄ /account bounce: /join redirects members to /account and /account
      // redirects non-members to /join, so a sign-in through either would load twice (a blank
      // flash on the way back from Google). Resolve the destination here instead.
      //
      // claim_member_import() is the same idempotent call the pages use: 'member' if they already
      // are one, 'claimed' if this is an imported member's first sign-in (it activates them now,
      // so they skip the bounce too), null if they still need to register. Any other failure just
      // falls back to `next`, whose page claims on its own — no worse than before.
      let dest = next;
      if (next === "/join" || next === "/account") {
        const { data: claim } = await supabase.rpc("claim_member_import");
        dest = claim === "member" || claim === "claimed" ? "/account" : "/join";
      }
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  const failed = new URL(next, origin);
  failed.searchParams.set("signin", "failed");
  return NextResponse.redirect(failed);
}
