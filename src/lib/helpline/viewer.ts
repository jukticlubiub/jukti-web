import "server-only";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { type HelplineMode, helplineMode } from "./mode";
import type { HelplineRole } from "./types";

export type HelplineViewer = { name: string; email: string };

export type HelplineViewerState = {
  mode: HelplineMode;
  /** Null when signed out. */
  viewer: HelplineViewer | null;
  /** Who they may answer as, or null if they can't answer. */
  role: HelplineRole | null;
  /** Academic Coordinators (and Master Admins) can hide questions and answers. */
  canModerate: boolean;
};

/** The pretend visitor in preview mode: signed in, and allowed to answer and moderate so every part can be tried. */
export const PREVIEW_VIEWER: HelplineViewer = { name: "Preview Student", email: "student@preview.test" };

type Claims = { email?: unknown; user_metadata?: unknown };

/** Their name from Google, as the database takes it: full name, else name, else the email's first part. */
export function nameFromClaims(claims: Claims) {
  const metadata = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  const email = typeof claims.email === "string" ? claims.email : "";
  return metadata.full_name || metadata.name || email.split("@")[0] || "";
}

/** The current visitor. Request-time only (reads cookies), so render it inside <Suspense>. */
export async function getHelplineViewer(): Promise<HelplineViewerState> {
  const mode = helplineMode();
  await connection();

  if (mode === "off") return { mode, viewer: null, role: null, canModerate: false };
  if (mode === "preview") return { mode, viewer: PREVIEW_VIEWER, role: "faculty", canModerate: true };

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { mode, viewer: null, role: null, canModerate: false };

  const [role, editor] = await Promise.all([supabase.rpc("helpline_role"), supabase.rpc("has_role", { p_role: "academic_coordinator" })]);
  return {
    mode,
    viewer: { name: nameFromClaims(claims), email: typeof claims.email === "string" ? claims.email : "" },
    role: (role.data as HelplineRole | null) ?? null,
    canModerate: editor.data === true,
  };
}
