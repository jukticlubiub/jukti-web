import { getAdmin } from "@/lib/admin/access";
import { getAdminEvent, getDayCheckIns, getRegistrations, getStationScans, getStations } from "@/lib/admin/data/events";
import { canAccess } from "@/lib/admin/roles";

/** Quotes a cell, and stops spreadsheet apps running typed-in text that starts like a formula. */
const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** "21 Oct 2026, 7:05 PM", in Dhaka time: read at a glance, and sorts fine within a day. */
const dhaka = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const when = (iso: string | null | undefined) => (iso ? dhaka.format(new Date(iso)) : "");

/**
 * The attendance sheet for every check-in day combined (Event Manager): one row per confirmed
 * person, then for each day its check-in time and its stations (Lunch…), and how many days they came.
 */
export async function GET(_request: Request, ctx: RouteContext<"/admin/events/[id]/attendance.csv">) {
  const admin = await getAdmin();
  if (admin.status !== "ok" || !canAccess(admin.roles, "events")) return new Response("Not allowed", { status: 403 });
  const { id } = await ctx.params;
  const event = await getAdminEvent(admin, id);
  if (!event) return new Response("Not found", { status: 404 });
  const [registrations, stations, dayCheckIns] = await Promise.all([getRegistrations(admin, id), getStations(admin, id), getDayCheckIns(admin, id)]);
  const scans = await getStationScans(admin, stations);

  const days = event.checkInDays;
  const multiDay = days > 1;
  const people = registrations.filter((r) => r.status === "registered");
  // That day's check-in. One-day events use the registration's own time (always the same thing).
  const entry = (r: (typeof people)[number], day: number) => (multiDay ? (dayCheckIns.get(r.id)?.[day] ?? null) : r.checkedInAt);
  // Collected on the RSVP form, when the event asked for them.
  const extras = (["department", "phone"] as const).filter((f) => event.rsvp.fields[f]);

  const dayColumns = Array.from({ length: days }, (_, i) => i + 1).flatMap((day) => [
    { label: multiDay ? `Day ${day} check-in` : "Checked in", value: (r: (typeof people)[number]) => when(entry(r, day)) },
    ...stations
      .filter((s) => s.day === day)
      .map((s) => ({ label: multiDay ? `Day ${day} ${s.name}` : s.name, value: (r: (typeof people)[number]) => when(scans.get(r.id)?.[s.id]) })),
  ]);

  const header = [
    "#",
    "Name",
    "Email",
    "Student ID",
    ...extras.map((f) => (f === "phone" ? "Phone" : "Department")),
    "Ticket",
    "Member",
    ...dayColumns.map((c) => c.label),
    ...(multiDay ? ["Days attended", "Came every day"] : []),
  ];
  const lines = [
    header.map(csvCell).join(","),
    ...people.map((r, i) => {
      const attended = Array.from({ length: days }, (_, d) => entry(r, d + 1)).filter(Boolean).length;
      return [
        String(i + 1),
        r.fullName,
        r.email,
        r.studentId,
        ...extras.map((f) => String(r.answers[f] ?? "")),
        r.ticketCode,
        r.isMember ? "Yes" : "No",
        ...dayColumns.map((c) => c.value(r)),
        ...(multiDay ? [`${attended} of ${days}`, attended === days ? "Yes" : "No"] : []),
      ]
        .map(csvCell)
        .join(",");
    }),
  ];
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-attendance.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
