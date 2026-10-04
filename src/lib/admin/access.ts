import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { supabaseEnv } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { type AdminArea, type AdminRole, adminRoles, canAccess } from "./roles";

/*
 * Who is using the admin panel.
 *
 * live: Supabase is connected. Roles come from user_roles (granted by email); the
 *   database's row-level security is the real guard, this only decides what to show.
 * preview: development without Supabase. A pretend admin, with roles picked in the
 *   panel's preview bar, sees sample data so every screen can be tried. Nothing is saved.
 */

export type AdminMode = "live" | "preview";

export type Admin = { mode: AdminMode; email: string; name: string; roles: AdminRole[] };

export type AdminState =
  | { status: "unavailable" }
  | { status: "signed-out" }
  | { status: "no-access"; email: string }
  | ({ status: "ok" } & Admin);

export const PREVIEW_ROLES_COOKIE = "jukti-admin-preview-roles";

export function adminMode(): AdminMode | null {
  if (supabaseEnv) return "live";
  return process.env.NODE_ENV === "development" ? "preview" : null;
}

/** The current admin (once per request). */
export const getAdmin = cache(async (): Promise<AdminState> => {
  await connection();
  const mode = adminMode();
  if (!mode) return { status: "unavailable" };

  if (mode === "preview") {
    const raw = (await cookies()).get(PREVIEW_ROLES_COOKIE)?.value;
    const picked = (raw ? raw.split(",") : ["master_admin"]).filter((r): r is AdminRole => (adminRoles as readonly string[]).includes(r));
    return { status: "ok", mode, email: "preview@jukti.test", name: "Preview Admin", roles: picked.length ? picked : ["master_admin"] };
  }

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { status: "signed-out" };
  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  const { data: roles } = await supabase.rpc("my_roles");
  const list = ((roles as string[] | null) ?? []).filter((r): r is AdminRole => (adminRoles as readonly string[]).includes(r));
  if (list.length === 0) return { status: "no-access", email };
  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  return { status: "ok", mode, email, name: meta.full_name || meta.name || email.split("@")[0], roles: list };
});

/** For a page in `area`: the admin, or a 404 for anyone who may not open it. */
export async function requireArea(area: AdminArea | ((roles: AdminRole[]) => boolean)): Promise<Admin> {
  const admin = await getAdmin();
  if (admin.status !== "ok") notFound();
  const allowed = typeof area === "function" ? area(admin.roles) : canAccess(admin.roles, area);
  if (!allowed) notFound();
  return admin;
}

/** For server actions: the admin if they may act in `area`, otherwise null. */
export async function adminFor(area: AdminArea | ((roles: AdminRole[]) => boolean)): Promise<Admin | null> {
  const admin = await getAdmin();
  if (admin.status !== "ok") return null;
  const allowed = typeof area === "function" ? area(admin.roles) : canAccess(admin.roles, area);
  return allowed ? admin : null;
}

/** The message server actions return in preview mode instead of saving. */
export const PREVIEW_NOT_SAVED = "Preview mode: connect Supabase to save changes. Nothing was changed.";
