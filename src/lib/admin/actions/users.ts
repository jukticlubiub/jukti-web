"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { type ActionState, explainDbError, failed, fieldErrors, ok, str } from "../form";
import { guard } from "../guard";
import { adminRoles, roleInfo } from "../roles";

const grantSchema = z.object({
  email: z.email("Enter the person’s Google email address."),
  roles: z.array(z.enum(adminRoles)).min(1, "Pick at least one role."),
});

export async function grantRoles(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("users");
  if (!g.ok) return g.state;
  const parsed = grantSchema.safeParse({ email: str(fd, "email").toLowerCase(), roles: fd.getAll("roles").map(String) });
  if (!parsed.success) return failed("Check the form.", fieldErrors(parsed.error));
  const rows = parsed.data.roles.map((role) => ({ email: parsed.data.email, role, granted_by: g.admin.email }));
  const { error } = await g.db.from("user_roles").upsert(rows, { onConflict: "email,role", ignoreDuplicates: true });
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, `Granted ${parsed.data.roles.map((r) => roleInfo[r].label).join(", ")} to ${parsed.data.email}. It applies when they next sign in.`);
}

export async function revokeRole(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("users");
  if (!g.ok) return g.state;
  const email = str(fd, "email");
  const role = str(fd, "role");
  const { error } = await g.db.from("user_roles").delete().eq("email", email).eq("role", role);
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, "Removed.");
}
