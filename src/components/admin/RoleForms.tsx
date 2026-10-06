"use client";

import { grantRoles, revokeRole } from "@/lib/admin/actions/users";
import { adminRoles, roleInfo } from "@/lib/admin/roles";
import { ActionButton, AdminForm, TextField } from "./forms";

/** Grant roles by email; with `email`, for that person only (e.g. from a member's page). */
export function GrantRolesForm({ email, held = [] }: { email?: string; held?: readonly string[] } = {}) {
  return (
    <AdminForm action={grantRoles} submitLabel="Grant access" resetOnSave>
      {(state) => (
        <>
          {email ? (
            <input type="hidden" name="email" value={email} />
          ) : (
            <TextField label="Google email" name="email" type="email" autoComplete="off" placeholder="name@gmail.com or name@iub.edu.bd" state={state} />
          )}
          <fieldset>
            <legend className="mb-2 text-[0.85rem] text-muted">Roles</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {adminRoles.filter((r) => !held.includes(r)).map((r) => (
                <label key={r} className="flex cursor-pointer gap-3 rounded-[12px] border border-glass-border bg-white/[0.02] p-3 has-checked:border-flare/60 has-checked:bg-lava/10">
                  <input type="checkbox" name="roles" value={r} className="mt-1 accent-[#f57c48]" />
                  <span>
                    <span className="block text-[0.95rem] text-fg">{roleInfo[r].label}</span>
                    <span className="block text-[0.82rem] leading-snug text-muted">{roleInfo[r].description}</span>
                  </span>
                </label>
              ))}
            </div>
            {state.fieldErrors?.roles && <p className="mt-1.5 text-[0.85rem] text-[#ff8f7a]">{state.fieldErrors.roles}</p>}
          </fieldset>
        </>
      )}
    </AdminForm>
  );
}

export function RevokeRoleButton({ email, role }: { email: string; role: string }) {
  return <ActionButton action={revokeRole} fields={{ email, role }} label="Remove" confirm="Remove this role?" tone="danger" />;
}
