"use client";

import { moderateMember, saveExecutive, updateImport } from "@/lib/admin/actions/members";
import type { Member } from "@/lib/members/types";
import { AdminForm, TextField, Toggle } from "./forms";

/** On a member's page: what others see of them (the public list on /team and the members directory). */
export function MemberModerationForm({ member }: { member: Member }) {
  return (
    <AdminForm action={moderateMember} submitLabel="Save">
      {(state) => (
        <>
          <input type="hidden" name="id" value={member.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" name="name" state={state} defaultValue={member.name} />
            <TextField label="Department" name="department" state={state} defaultValue={member.department} />
          </div>
          <Toggle
            label="Hide from the public members list"
            name="hide_from_public"
            defaultChecked={member.hideFromPublic}
            hint="The Team Jukti page. The member can also change this on their profile."
          />
          {member.showInDirectory ? (
            <Toggle label="Listed in the members directory" name="show_in_directory" defaultChecked hint="Switch off to take them out. Only they can put themselves back in." />
          ) : (
            <p className="text-[0.88rem] text-muted">Not in the members directory (members choose this themselves).</p>
          )}
          {member.photoUrl && <Toggle label="Remove their photo" name="remove_photo" hint="Deletes it from the site, the directory and their member card. They can upload a new one." />}
          {member.bio && <Toggle label="Remove their bio" name="clear_bio" hint={`“${member.bio.slice(0, 120)}${member.bio.length > 120 ? "…" : ""}”`} />}
        </>
      )}
    </AdminForm>
  );
}

/** Add an executive code, or name one that members already used. */
export function ExecutiveForm({ code, name, active = true, submitLabel = "Add code" }: { code?: string; name?: string; active?: boolean; submitLabel?: string }) {
  return (
    <AdminForm action={saveExecutive} submitLabel={submitLabel} resetOnSave={!code}>
      {(state) => (
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <input type="hidden" name="active" value={active ? "on" : "off"} />
          {code ? (
            <>
              <input type="hidden" name="code" value={code} />
              <p className="self-end pb-2.5 font-mono text-[0.95rem] text-fg">{code}</p>
            </>
          ) : (
            <TextField label="Code" name="code" state={state} autoComplete="off" placeholder="e.g. TM.ME" />
          )}
          <TextField label="Executive’s name" name="name" state={state} defaultValue={name} autoComplete="off" />
        </div>
      )}
    </AdminForm>
  );
}

/** Fix an imported member's name or department, or hide them from the public list. */
export function ImportEditForm({ email, name, department, hidden }: { email: string; name: string; department: string | null; hidden: boolean }) {
  return (
    <AdminForm action={updateImport} submitLabel="Save">
      {(state) => (
        <>
          <input type="hidden" name="email" value={email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" name="name" state={state} defaultValue={name} />
            <TextField label="Department" name="department" state={state} defaultValue={department} />
          </div>
          <Toggle label="Hide from the public members list" name="hide_from_public" defaultChecked={hidden} />
        </>
      )}
    </AdminForm>
  );
}
