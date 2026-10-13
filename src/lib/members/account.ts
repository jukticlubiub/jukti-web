import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseEnv } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { iubIdFromEmail } from "./semester";
import { MEMBER_COLUMNS, type Member, type MemberRow, toMember } from "./types";

/**
 * live: accounts are stored in Supabase and need a Google sign-in.
 * preview: no Supabase yet, in development. You're signed in as a pretend IUB student and
 *   your registration is kept in a cookie in this browser, so the flow can be tried out.
 * off: no Supabase in production. Joining isn't open online yet.
 */
export type MemberMode = "live" | "preview" | "off";

export function memberMode(): MemberMode {
  if (supabaseEnv) return "live";
  return process.env.NODE_ENV === "development" ? "preview" : "off";
}

export type AccountUser = {
  id: string;
  email: string;
  /** From Google. */
  name: string;
  avatarUrl: string | null;
  /** Signed in with a 7-digit IUB student email: allowed to register. */
  iubId: string | null;
  /** Emails of the Google accounts that can sign in to this account (the IUB one, plus a linked personal one). */
  googleEmails: string[];
};

export type Account = { mode: MemberMode; user: AccountUser | null; member: Member | null };

export const PREVIEW_USER: AccountUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "2510123@iub.edu.bd",
  name: "Preview Student",
  avatarUrl: null,
  iubId: "2510123",
  googleEmails: ["2510123@iub.edu.bd"],
};

/** The signed-in visitor and their member record. Request-time only (reads cookies), so render it inside <Suspense>. */
export async function getAccount(): Promise<Account> {
  const mode = memberMode();
  await connection();
  if (mode === "off") return { mode, user: null, member: null };
  if (mode === "preview") return { mode, user: PREVIEW_USER, member: await readPreviewMember() };

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return { mode, user: null, member: null };

  const metadata = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const user: AccountUser = {
    id: u.id,
    email: u.email ?? "",
    name: metadata.full_name || metadata.name || (u.email ?? "").split("@")[0],
    avatarUrl: metadata.avatar_url || metadata.picture || null,
    iubId: iubIdFromEmail(u.email),
    googleEmails: (u.identities ?? [])
      .filter((i) => i.provider === "google")
      .map((i) => String((i.identity_data as { email?: string } | undefined)?.email ?? ""))
      .filter(Boolean),
  };

  const load = () => supabase.from("members").select(MEMBER_COLUMNS).eq("id", u.id).maybeSingle();
  let { data: row, error } = await load();
  if (error) throw new Error(`Couldn't load your membership: ${error.message}`);
  // Registered through the old registration app (imported)? Their first sign-in here makes them a member.
  if (!row) {
    const { data: claimed } = await supabase.rpc("claim_member_import");
    if (claimed === "claimed") ({ data: row, error } = await load());
  }
  return { mode, user, member: row ? toMember(row as MemberRow) : null };
}

export type MemberAccount = Account & { user: AccountUser; member: Member };

/**
 * Whether the signed-in member came from the old registration app (claimed an imported
 * membership). They paid and were verified there, so they're never asked for an executive's code.
 */
export async function isImportedMember(): Promise<boolean> {
  if (memberMode() !== "live") return false;
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc("is_imported_member");
  return data === true;
}

/** The signed-in member, or a redirect to /join (signed out, or not registered). */
export async function requireMember(): Promise<MemberAccount> {
  const account = await getAccount();
  if (!account.user || !account.member) redirect("/join");
  return account as MemberAccount;
}

// ---------------------------------------------------------------------------
// Preview (development without Supabase): the registration lives in a cookie.
// ---------------------------------------------------------------------------

const PREVIEW_COOKIE = "jukti-member-preview";

export async function readPreviewMember(): Promise<Member | null> {
  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  try {
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    return null;
  }
}

export async function writePreviewMember(member: Member | null) {
  const store = await cookies();
  if (!member) return store.delete(PREVIEW_COOKIE);
  store.set(PREVIEW_COOKIE, JSON.stringify(member), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
