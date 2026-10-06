import { getAdmin } from "@/lib/admin/access";
import { getAdminEvent, getRegistrations, getStationScans, getStations } from "@/lib/admin/data/events";
import { canAccess } from "@/lib/admin/roles";

/** Quotes a cell, and stops spreadsheet apps running typed-in text that starts like a formula. */
const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** The RSVP list as a spreadsheet (Event Manager). */
export async function GET(_request: Request, ctx: RouteContext<"/admin/events/[id]/rsvps.csv">) {
  const admin = await getAdmin();
  if (admin.status !== "ok" || !canAccess(admin.roles, "events")) return new Response("Not allowed", { status: 403 });
  const { id } = await ctx.params;
  const event = await getAdminEvent(admin, id);
  if (!event) return new Response("Not found", { status: 404 });
  const [rows, stations] = await Promise.all([getRegistrations(admin, id), getStations(admin, id)]);
  const scans = await getStationScans(admin, stations);
  const lines = [
    ["Name", "Email", "Student ID", "Ticket", "Status", "Payment", "bKash sender", "bKash TxID", "Paid at", "Signed up", "Checked in", ...stations.map((s) => s.name)].join(","),
    ...rows.map((r) =>
      [
        r.fullName,
        r.email,
        r.studentId,
        r.ticketCode,
        r.status,
        r.payment.status === "not_required" ? "" : r.payment.status,
        r.payment.sender ?? "",
        r.payment.txn ?? "",
        r.payment.paidAt ?? "",
        r.createdAt,
        r.checkedInAt ?? "",
        ...stations.map((s) => scans.get(r.id)?.[s.id] ?? ""),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-rsvps.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
