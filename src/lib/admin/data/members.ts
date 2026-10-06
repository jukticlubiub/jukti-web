import "server-only";
import { MEMBER_COLUMNS, type Member, type MemberRow, toMember } from "@/lib/members/types";
import type { Admin } from "../access";
import { adminDb } from "../guard";
import type { AdminRole } from "../roles";

/** Every member, newest registration first (Membership Manager). */
export async function listMembersForAdmin(admin: Admin): Promise<Member[]> {
  if (admin.mode === "preview") return previewMembers;
  const db = await adminDb();
  const all: Member[] = [];
  // Supabase returns at most 1000 rows per request.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("members").select(MEMBER_COLUMNS).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error(`Couldn't load members: ${error.message}`);
    all.push(...(data as MemberRow[]).map(toMember));
    if (data.length < 1000) return all;
  }
}

export async function getMemberForAdmin(admin: Admin, id: string): Promise<Member | null> {
  if (admin.mode === "preview") return previewMembers.find((m) => m.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await adminDb();
  const { data, error } = await db.from("members").select(MEMBER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the member: ${error.message}`);
  return data ? toMember(data as MemberRow) : null;
}

/** Executive codes → names (the codes members enter after paying). */
export async function getExecutiveNames(admin: Admin): Promise<Map<string, string>> {
  if (admin.mode === "preview") return new Map([["EX01", "Sample Executive"]]);
  const db = await adminDb();
  const { data } = await db.from("executives").select("code, name");
  return new Map(((data ?? []) as { code: string; name: string }[]).map((e) => [e.code, e.name]));
}

/** The admin roles held by this email (shown to Master Admins on a member's page). */
export async function getRolesFor(admin: Admin, email: string): Promise<AdminRole[]> {
  if (admin.mode === "preview") return [];
  const db = await adminDb();
  const { data } = await db.from("user_roles").select("role").eq("email", email.toLowerCase());
  return ((data ?? []) as { role: AdminRole }[]).map((r) => r.role);
}

export async function countPendingMembers(admin: Admin): Promise<number> {
  if (admin.mode === "preview") return previewMembers.filter((m) => m.status === "pending").length;
  const db = await adminDb();
  const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

/** Name and photo by email, for People & roles (Master Admins can read members). */
export async function getMembersByEmail(admin: Admin, emails: string[]): Promise<Map<string, { id: string; name: string; photoUrl: string | null }>> {
  if (admin.mode === "preview" || emails.length === 0) return new Map();
  const db = await adminDb();
  const { data } = await db.from("members").select("id, name, email, photo_url").in("email", emails);
  return new Map(((data ?? []) as { id: string; name: string; email: string; photo_url: string | null }[]).map((m) => [m.email.toLowerCase(), { id: m.id, name: m.name, photoUrl: m.photo_url }]));
}

const sample = (n: number, over: Partial<Member>): Member => ({
  id: `00000000-0000-4000-8000-00000000010${n}`,
  email: `22${n}0${n}0${n}@iub.edu.bd`,
  name: `Sample Member ${n}`,
  iubId: `22${n}0${n}0${n}`,
  department: "CSE",
  semester: "5th",
  residenceArea: "Bashundhara",
  contactNumber: "01712345678",
  facebookLink: null,
  bloodGroup: "O+",
  notes: null,
  paymentMethod: "Bkash",
  bkashTransactionId: "9A7B6C5D4E",
  bkashSenderNumber: "01812345678",
  executiveId: "EX01",
  interests: ["Event Management"],
  coCurricular: ["Hackathon"],
  createdAt: new Date(Date.UTC(2026, 9, n)).toISOString(),
  status: "approved",
  approvedAt: null,
  approvedBy: null,
  reviewNote: null,
  memberNo: null,
  secondaryEmail: `sample${n}@gmail.com`,
  photoUrl: null,
  bio: null,
  linkedin: null,
  github: null,
  skills: [],
  showInDirectory: false,
  hideFromPublic: false,
  ...over,
});

const previewMembers: Member[] = [
  sample(1, { status: "pending" }),
  sample(2, { status: "pending", paymentMethod: "Cash", bkashTransactionId: null, bkashSenderNumber: null }),
  sample(3, { status: "approved", memberNo: "JKT-26-0003", approvedAt: "2026-09-12T10:00:00Z", approvedBy: "jukti-reg import" }),
  sample(4, { status: "rejected", reviewNote: "Transaction not found." }),
];

/** Members imported from the registration app who haven't signed in here yet. */
export type ImportedMember = {
  email: string;
  name: string;
  iubId: string | null;
  department: string | null;
  paymentMethod: string | null;
  bkashSenderNumber: string | null;
  bkashTransactionId: string | null;
  executive: string | null;
  registeredAt: string;
  memberNo: string | null;
  hideFromPublic: boolean;
};

export async function listImportsForAdmin(admin: Admin): Promise<ImportedMember[]> {
  if (admin.mode === "preview") {
    return [{ email: "2110001@iub.edu.bd", name: "Imported Sample", iubId: "2110001", department: "CSE", paymentMethod: "Bkash", bkashSenderNumber: "01812345678", bkashTransactionId: null, executive: "Sample Executive", registeredAt: "2026-01-01T04:00:00Z", memberNo: "JKT-26-0001", hideFromPublic: false }];
  }
  const db = await adminDb();
  const all: ImportedMember[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("member_imports")
      .select("email, name, iub_id, department, payment_method, bkash_sender_number, bkash_transaction_id, executive, registered_at, member_no, hide_from_public")
      .is("claimed_at", null)
      .order("registered_at")
      .range(from, from + 999);
    if (error) throw new Error(`Couldn't load imported members: ${error.message}`);
    for (const r of data as (Record<string, string | null> & { hide_from_public: boolean })[]) {
      all.push({
        email: r.email!,
        name: r.name!,
        iubId: r.iub_id,
        department: r.department,
        paymentMethod: r.payment_method,
        bkashSenderNumber: r.bkash_sender_number,
        bkashTransactionId: r.bkash_transaction_id,
        executive: r.executive,
        registeredAt: r.registered_at!,
        memberNo: r.member_no,
        hideFromPublic: r.hide_from_public,
      });
    }
    if (data.length < 1000) return all;
  }
}

export type Executive = { code: string; name: string; active: boolean; uses: number };

/** Executive codes, with how many members (registered here or imported) entered each. */
export async function listExecutives(admin: Admin): Promise<Executive[]> {
  if (admin.mode === "preview") return [{ code: "EX01", name: "Sample Executive", active: true, uses: 3 }];
  const db = await adminDb();
  const [codes, members, imported] = await Promise.all([
    db.from("executives").select("code, name, active").order("name"),
    db.from("members").select("executive_id"),
    db.from("member_imports").select("executive"),
  ]);
  if (codes.error) throw new Error(`Couldn't load executive codes: ${codes.error.message}`);
  const uses = new Map<string, number>();
  for (const code of [...((members.data ?? []) as { executive_id: string | null }[]).map((m) => m.executive_id), ...((imported.data ?? []) as { executive: string | null }[]).map((m) => m.executive)]) {
    if (code) uses.set(code, (uses.get(code) ?? 0) + 1);
  }
  const known = (codes.data as { code: string; name: string; active: boolean }[]).map((e) => ({ ...e, uses: uses.get(e.code) ?? 0 }));
  // Codes members used that aren't in the table yet, so they can be named.
  const unknown = [...uses.entries()].filter(([code]) => !known.some((e) => e.code === code)).map(([code, n]) => ({ code, name: "", active: false, uses: n }));
  return [...known, ...unknown.sort((a, b) => b.uses - a.uses)];
}

