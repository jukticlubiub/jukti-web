"use client";

import { useMemo, useState } from "react";
import { cancelRegistration, setPaid, toggleCheckIn } from "@/lib/admin/actions/events";
import type { Registration } from "@/lib/admin/data/events";
import { cn } from "@/lib/cn";
import { ActionButton, inputClass } from "../forms";

const tone = { registered: "text-emerald-300", waitlisted: "text-sky-300", cancelled: "text-muted line-through" } as const;

/** Everyone who RSVP'd: search, check people in at the door, cancel a seat (Event Manager). */
export function RsvpTable({ registrations, csvHref }: { registrations: Registration[]; csvHref: string }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"active" | "all" | "payment">("active");
  const hasFee = registrations.some((r) => r.payment.status !== "not_required");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter(
      (r) =>
        (show === "all" || r.status !== "cancelled") &&
        (show !== "payment" || r.payment.status === "submitted" || r.payment.status === "unpaid") &&
        (!q || `${r.fullName} ${r.email} ${r.studentId} ${r.ticketCode} ${r.payment.sender ?? ""} ${r.payment.txn ?? ""}`.toLowerCase().includes(q)),
    );
  }, [registrations, query, show]);
  const count = (s: Registration["status"]) => registrations.filter((r) => r.status === s).length;
  const checkedIn = registrations.filter((r) => r.checkedInAt && r.status === "registered").length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9rem]">
        <span><span className="text-fg">{count("registered")}</span> <span className="text-muted">registered</span></span>
        <span><span className="text-fg">{count("waitlisted")}</span> <span className="text-muted">waitlisted</span></span>
        <span><span className="text-fg">{checkedIn}</span> <span className="text-muted">checked in</span></span>
        <span><span className="text-fg">{count("cancelled")}</span> <span className="text-muted">cancelled</span></span>
        {hasFee && (
          <span>
            <span className="text-fg">{registrations.filter((r) => r.status !== "cancelled" && r.payment.status === "submitted").length}</span>{" "}
            <span className="text-muted">payments to check</span>
          </span>
        )}
        <a href={csvHref} className="ml-auto btn-pill btn-ghost h-9 px-4 text-[0.75rem]">Download CSV</a>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, ticket or bKash" aria-label="Search RSVPs" className={cn(inputClass, "h-10 max-w-xs text-[0.9rem]")} />
        <select value={show} onChange={(e) => setShow(e.target.value as "active" | "all" | "payment")} aria-label="Show" className={cn(inputClass, "h-10 w-auto bg-[#141110] text-[0.9rem]")}>
          <option value="active">Registered & waitlisted</option>
          <option value="all">Including cancelled</option>
          {hasFee && <option value="payment">Payment not confirmed</option>}
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[0.92rem] text-muted">{registrations.length === 0 ? "No RSVPs yet." : "No one matches."}</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-glass-border">
          <table className="w-full min-w-[40rem] text-left text-[0.9rem]">
            <thead className="bg-white/[0.03] text-[0.72rem] tracking-[0.08em] text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Student ID</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                {hasFee && <th className="px-4 py-2.5 font-medium">Payment</th>}
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="block text-fg">{r.fullName}</span>
                    <span className="block text-[0.8rem] text-muted">{r.email}</span>
                    <span className="block font-mono text-[0.78rem] text-muted">{r.ticketCode}</span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{r.studentId || <span className="text-muted">Guest</span>}</td>
                  <td className={cn("px-4 py-2.5 capitalize", tone[r.status])}>
                    {r.status}
                    {r.checkedInAt && r.status === "registered" && <span className="ml-2 text-[0.78rem] text-flare normal-case">· checked in</span>}
                  </td>
                  {hasFee && (
                    <td className="px-4 py-2.5">
                      <PaymentCell registration={r} />
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    {r.status !== "cancelled" && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === "registered" && (
                          <ActionButton action={toggleCheckIn} fields={{ id: r.id, checkedIn: String(Boolean(r.checkedInAt)) }} label={r.checkedInAt ? "Undo check-in" : "Check in"} tone={r.checkedInAt ? "ghost" : "primary"} />
                        )}
                        <ActionButton action={cancelRegistration} fields={{ id: r.id }} label="Cancel" confirm="Cancel this RSVP?" tone="danger" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const paymentLabel = { not_required: "—", unpaid: "Not paid", submitted: "To check", paid: "Paid" } as const;

/** The fee: what they reported (bKash number, transaction ID), and confirm or undo. */
function PaymentCell({ registration: r }: { registration: Registration }) {
  const p = r.payment;
  if (p.status === "not_required") return <span className="text-muted">—</span>;
  return (
    <div className="grid gap-1.5">
      <span className={cn("text-[0.85rem]", p.status === "paid" ? "text-emerald-300" : p.status === "submitted" ? "text-amber-200" : "text-muted")}>{paymentLabel[p.status]}</span>
      {p.sender && (
        <span className="text-[0.8rem] text-muted tabular-nums">
          bKash {p.sender}
          {p.txn ? ` · ${p.txn}` : ""}
        </span>
      )}
      {r.status !== "cancelled" &&
        (p.status === "paid" ? (
          <ActionButton action={setPaid} fields={{ id: r.id, paid: "false" }} label="Undo" confirm="Mark as not paid? Their ticket stops working at the entry." />
        ) : (
          <ActionButton action={setPaid} fields={{ id: r.id, paid: "true" }} label="Mark paid" tone={p.status === "submitted" ? "primary" : "ghost"} confirm={p.status === "unpaid" ? "They haven’t reported a payment. Mark paid anyway (e.g. paid in cash)?" : undefined} />
        ))}
    </div>
  );
}

