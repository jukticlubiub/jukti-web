import "server-only";
import type { Admin } from "../access";
import { adminDb } from "../guard";
import type { AdminRole } from "../roles";

export type RoleHolder = { email: string; roles: { role: AdminRole; grantedBy: string | null; createdAt: string }[] };

export async function getRoleHolders(admin: Admin): Promise<RoleHolder[]> {
  if (admin.mode === "preview") {
    return [{ email: admin.email, roles: admin.roles.map((role) => ({ role, grantedBy: "preview", createdAt: new Date().toISOString() })) }];
  }
  const db = await adminDb();
  const { data, error } = await db.from("user_roles").select("email, role, granted_by, created_at").order("email");
  if (error) throw new Error(`Couldn't load roles: ${error.message}`);
  const byEmail = new Map<string, RoleHolder>();
  for (const r of data as { email: string; role: AdminRole; granted_by: string | null; created_at: string }[]) {
    const holder = byEmail.get(r.email) ?? { email: r.email, roles: [] };
    holder.roles.push({ role: r.role, grantedBy: r.granted_by, createdAt: r.created_at });
    byEmail.set(r.email, holder);
  }
  return [...byEmail.values()];
}

export type ActivityEntry = { id: number; at: string; actor: string | null; table: string; rowId: string | null; action: string; label: string | null };

export async function getActivity(admin: Admin, limit = 200): Promise<ActivityEntry[]> {
  if (admin.mode === "preview") return [];
  const db = await adminDb();
  const { data, error } = await db.from("audit_log").select("id, at, actor, table_name, row_id, action, label").order("at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Couldn't load the activity log: ${error.message}`);
  return (data as { id: number; at: string; actor: string | null; table_name: string; row_id: string | null; action: string; label: string | null }[]).map((r) => ({
    id: r.id,
    at: r.at,
    actor: r.actor,
    table: r.table_name,
    rowId: r.row_id,
    action: r.action,
    label: r.label,
  }));
}
