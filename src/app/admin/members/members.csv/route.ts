import { getAdmin } from "@/lib/admin/access";
import { getExecutiveNames, listImportsForAdmin, listMembersForAdmin } from "@/lib/admin/data/members";
import { canAccess } from "@/lib/admin/roles";

/** Quotes a cell, and stops spreadsheet apps running typed-in text that starts like a formula. */
const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** Every member as a spreadsheet (Membership Manager). */
export async function GET() {
  const admin = await getAdmin();
  if (admin.status !== "ok" || !canAccess(admin.roles, "members")) return new Response("Not allowed", { status: 403 });
  const [members, executives, imported] = await Promise.all([listMembersForAdmin(admin), getExecutiveNames(admin), listImportsForAdmin(admin)]);
  const lines = [
    ["Member no.", "Name", "Status", "IUB ID", "IUB email", "Personal email", "Department", "Mobile", "Lives in", "Blood group", "Payment", "bKash sender", "bKash TxID", "Executive", "Interests", "Co-curricular", "Registered", "Approved"].join(","),
    ...members.map((m) =>
      [
        m.memberNo ?? "",
        m.name,
        m.status,
        m.iubId,
        m.email,
        m.secondaryEmail ?? "",
        m.department,
        m.contactNumber,
        m.residenceArea,
        m.bloodGroup ?? "",
        m.paymentMethod ?? "",
        m.bkashSenderNumber ?? "",
        m.bkashTransactionId ?? "",
        m.executiveId ? (executives.get(m.executiveId) ?? m.executiveId) : "",
        m.interests.join("; "),
        m.coCurricular.join("; "),
        m.createdAt,
        m.approvedAt ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
    // Imported from the registration app, not signed in here yet.
    ...imported.map((m) =>
      [m.memberNo ?? "", m.name, "imported", m.iubId ?? "", m.email, "", m.department ?? "", "", "", "", m.paymentMethod ?? "", m.bkashSenderNumber ?? "", m.bkashTransactionId ?? "", m.executive ?? "", "", "", m.registeredAt, m.registeredAt]
        .map(csvCell)
        .join(","),
    ),
  ];
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jukti-members.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
