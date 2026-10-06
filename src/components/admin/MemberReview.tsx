"use client";

import { useState } from "react";
import { reviewMember } from "@/lib/admin/actions/members";
import type { MemberStatus } from "@/lib/members/options";
import { AdminForm, TextArea } from "./forms";

type Decision = "approve" | "reject" | "lapse";

/** Approve, send back with a note (the member sees it and can fix their details), or mark lapsed. */
export function MemberReview({ id, status }: { id: string; status: MemberStatus }) {
  const options: { value: Decision; label: string; hint: string }[] = [
    ...(status !== "approved" ? [{ value: "approve" as const, label: "Approve", hint: "Payment checked. They get an email and their member card." }] : []),
    ...(status === "pending" ? [{ value: "reject" as const, label: "Send back", hint: "Something’s wrong (e.g. payment not found). They see your note and can fix it." }] : []),
    ...(status === "approved" ? [{ value: "lapse" as const, label: "Mark lapsed", hint: "No longer a member (e.g. didn’t renew). Their card shows as lapsed at the door." }] : []),
  ];
  const [decision, setDecision] = useState<Decision>(options[0]?.value ?? "approve");
  if (options.length === 0) return null;

  return (
    <AdminForm action={reviewMember} submitLabel={options.find((o) => o.value === decision)?.label ?? "Save"} danger={decision !== "approve"}>
      {(state) => (
        <>
          <input type="hidden" name="id" value={id} />
          <fieldset className="grid gap-2">
            <legend className="sr-only">Decision</legend>
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer gap-3 rounded-[12px] border border-glass-border bg-white/[0.02] p-3 has-checked:border-flare/60 has-checked:bg-lava/10">
                <input type="radio" name="decision" value={o.value} checked={decision === o.value} onChange={() => setDecision(o.value)} className="mt-1 accent-[#f57c48]" />
                <span>
                  <span className="block text-[0.95rem] text-fg">{o.label}</span>
                  <span className="block text-[0.82rem] leading-snug text-muted">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <TextArea
            label={decision === "approve" ? "Note (optional, only admins see it)" : "Note for the member"}
            name="note"
            rows={3}
            state={state}
            placeholder={decision === "reject" ? "e.g. We couldn’t find this bKash payment. Check the sender number." : ""}
          />
        </>
      )}
    </AdminForm>
  );
}
