import { getAdmin } from "@/lib/admin/access";
import { getAdminEvent, getRegistrations } from "@/lib/admin/data/events";
import { canAccess } from "@/lib/admin/roles";

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The RSVP list as a spreadsheet (Event Manager). */
export async function GET(_request: Request, ctx: RouteContext<"/admin/events/[id]/rsvps.csv">) {
  const admin = await getAdmin();
  if (admin.status !== "ok" || !canAccess(admin.roles, "events")) return new Response("Not allowed", { status: 403 });
  const { id } = await ctx.params;
  const event = await getAdminEvent(admin, id);
  if (!event) return new Response("Not found", { status: 404 });
  const rows = await getRegistrations(admin, id);
  const lines = [
    ["Name", "Email", "Student ID", "Status", "Signed up", "Checked in"].join(","),
    ...rows.map((r) => [r.fullName, r.email, r.studentId, r.status, r.createdAt, r.checkedInAt ?? ""].map(csvCell).join(",")),
  ];
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-rsvps.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
