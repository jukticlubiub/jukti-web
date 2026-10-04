import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { type Admin, adminFor, PREVIEW_NOT_SAVED } from "./access";
import { type ActionState, failed } from "./form";
import type { AdminArea, AdminRole } from "./roles";

type Session = Awaited<ReturnType<typeof createSessionClient>>;

/**
 * Start of every admin server action: the admin and a Supabase client acting as them,
 * or the ActionState to return (not allowed, or preview mode where nothing is saved).
 * Row-level security in the database checks the role again on every write.
 */
export async function guard(
  area: AdminArea | ((roles: AdminRole[]) => boolean),
): Promise<{ ok: true; admin: Admin; db: Session } | { ok: false; state: ActionState }> {
  const admin = await adminFor(area);
  if (!admin) return { ok: false, state: failed("Your role doesn’t allow this. Ask a Master Admin if you need access.") };
  if (admin.mode === "preview") return { ok: false, state: failed(PREVIEW_NOT_SAVED) };
  return { ok: true, admin, db: await createSessionClient() };
}

/** For reads: a Supabase client as the signed-in admin (live mode only). */
export async function adminDb() {
  return createSessionClient();
}
