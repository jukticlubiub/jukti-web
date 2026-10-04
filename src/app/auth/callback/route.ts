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
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failed = new URL(next, origin);
  failed.searchParams.set("signin", "failed");
  return NextResponse.redirect(failed);
}
