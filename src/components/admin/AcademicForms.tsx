"use client";

import { useState } from "react";
import { addSenior, removeSenior, saveFaculty } from "@/lib/admin/actions/academic";
import type { AdminFaculty } from "@/lib/admin/data/academic";
import { ActionButton, AdminForm, TextField, Toggle } from "./forms";
import { Pill } from "./ui";

/** Add or edit someone in the faculty directory (Academic Coordinator). */
export function FacultyForm({ faculty, nextPosition }: { faculty?: AdminFaculty; nextPosition?: number }) {
  return (
    <AdminForm action={saveFaculty} submitLabel={faculty ? "Save" : "Add to the directory"} resetOnSave={!faculty}>
      {(state) => (
        <>
          {faculty && <input type="hidden" name="id" value={faculty.id} />}
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Name" name="name" state={state} defaultValue={faculty?.name} />
            <TextField label="Designation" name="designation" state={state} defaultValue={faculty?.designation} placeholder="e.g. Assistant Professor" />
            <TextField label="Room" name="room" state={state} defaultValue={faculty?.room} placeholder="e.g. BC 6011B" />
            <TextField label="IUB email (shown publicly)" name="email" type="email" state={state} defaultValue={faculty?.email} />
            <TextField
              label="Google sign-in email (if different, not shown)"
              name="loginEmail"
              type="email"
              state={state}
              defaultValue={faculty?.loginEmail}
              hint={<span className="text-[0.75rem] text-muted">Lets them answer as Faculty</span>}
            />
            <TextField label="Order in the directory" name="position" type="number" min={0} state={state} defaultValue={faculty?.position ?? nextPosition ?? 0} />
          </div>
          <div className="flex flex-wrap gap-6">
            <Toggle label="Listed in the directory" name="active" defaultChecked={faculty?.active ?? true} />
            <Toggle label="Emailed about new questions" name="notify" defaultChecked={faculty?.notify ?? true} />
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function FacultyRow({ faculty }: { faculty: AdminFaculty }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="rounded-[16px] border border-glass-border bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-fg">{faculty.name}</p>
          <p className="text-[0.85rem] text-muted">
            {faculty.designation} · {faculty.room ?? "No room"} · {faculty.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!faculty.active && <Pill tone="red">Not listed</Pill>}
          {faculty.active && !faculty.notify && <Pill>No emails</Pill>}
          {faculty.loginEmail && <Pill tone="blue">Signs in as {faculty.loginEmail}</Pill>}
        </div>
        <button type="button" onClick={() => setEditing((e) => !e)} aria-expanded={editing} className="h-8 rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">
          {editing ? "Close" : "Edit"}
        </button>
      </div>
      {editing && (
        <div className="border-t border-glass-border p-4">
          <FacultyForm faculty={faculty} />
        </div>
      )}
    </li>
  );
}

export function AddSeniorForm() {
  return (
    <AdminForm action={addSenior} submitLabel="Add senior" resetOnSave>
      {(state) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" name="name" state={state} />
          <TextField label="Google email" name="email" type="email" state={state} />
        </div>
      )}
    </AdminForm>
  );
}

export function RemoveSeniorButton({ email }: { email: string }) {
  return <ActionButton action={removeSenior} fields={{ email }} label="Remove" confirm="Remove?" tone="danger" />;
}
