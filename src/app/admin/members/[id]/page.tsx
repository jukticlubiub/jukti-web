import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemberModerationForm } from "@/components/admin/MemberAdminForms";
import { MemberReview } from "@/components/admin/MemberReview";
import { GrantRolesForm, RevokeRoleButton } from "@/components/admin/RoleForms";
import { formatWhen, PageHeader, PageSkeleton, Panel, Pill } from "@/components/admin/ui";
import { Avatar } from "@/components/members/AccountHeader";
import { requireArea } from "@/lib/admin/access";
import { getExecutiveNames, getMemberForAdmin, getRolesFor } from "@/lib/admin/data/members";
import { roleInfo } from "@/lib/admin/roles";
import { statusInfo, statusPillTone } from "@/lib/members/options";
import { intakeLabel } from "@/lib/members/semester";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Member" };

export default function MemberAdminPage({ params }: PageProps<"/admin/members/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MemberDetail params={params} />
    </Suspense>
  );
}

async function MemberDetail({ params }: Pick<PageProps<"/admin/members/[id]">, "params">) {
  const admin = await requireArea("members");
  const { id } = await params;
  const member = await getMemberForAdmin(admin, id);
  if (!member) notFound();
  const isMaster = admin.roles.includes("master_admin");
  const [executives, roles] = await Promise.all([getExecutiveNames(admin), isMaster ? getRolesFor(admin, member.email) : Promise.resolve([])]);

  const rows: [string, React.ReactNode][] = [
    ["IUB email", member.email],
    ["Personal email", member.secondaryEmail ?? "—"],
    ["IUB ID", `${member.iubId}${intakeLabel(member.iubId) ? ` · ${intakeLabel(member.iubId)} intake` : ""}`],
    ["Semester (when registered)", member.semester ?? "—"],
    ["Department", member.department || "—"],
    ["Mobile", member.contactNumber ? <a href={`tel:${member.contactNumber}`} className="hover:text-flare">{member.contactNumber}</a> : "—"],
    ["Lives in", member.residenceArea || "—"],
    ["Blood group", member.bloodGroup ?? "—"],
    ["Facebook", member.facebookLink ? <a href={member.facebookLink} target="_blank" rel="noreferrer" className="text-flare hover:underline">Profile ↗</a> : "—"],
    ["Interests", [...member.interests, ...member.coCurricular].join(", ") || "—"],
    ["Notes", member.notes ?? "—"],
  ];

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-block text-[0.88rem] text-muted hover:text-fg">
        ← Members
      </Link>
      <PageHeader title={member.name} description={member.memberNo ? `Member ${member.memberNo}` : `Registered ${formatWhen(member.createdAt)}`}>
        <Pill tone={statusPillTone[member.status]}>{statusInfo[member.status].label}</Pill>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="grid gap-5">
          <Panel title="Payment" description="Check this against the bKash statement or with the executive before approving.">
            <dl className="grid gap-3 text-[0.95rem]">
              <Item label="Method" value={member.paymentMethod === "Bkash" ? "bKash" : (member.paymentMethod ?? "—")} />
              <Item label="Executive" value={member.executiveId ? `${executives.get(member.executiveId) ?? "Unknown code"} (${member.executiveId})` : "—"} />
              {member.paymentMethod === "Bkash" && (
                <>
                  <Item label="Sender number" value={member.bkashSenderNumber ?? "—"} />
                  <Item label="Transaction ID" value={member.bkashTransactionId ?? "Not given"} />
                </>
              )}
            </dl>
          </Panel>

          <Panel title="Details">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={member.name} url={member.photoUrl} className="size-16 text-[2.2rem]" />
              <p className="text-[0.92rem] text-muted">{member.bio ?? "No bio."}</p>
            </div>
            <dl className="grid gap-3 text-[0.95rem]">
              {rows.map(([label, value]) => (
                <Item key={label} label={label} value={value} />
              ))}
            </dl>
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel title="Review">
            {member.reviewNote && <p className="mb-4 rounded-[12px] border border-glass-border bg-white/[0.03] p-3 text-[0.9rem] text-body">Last note: {member.reviewNote}</p>}
            {member.approvedAt && (
              <p className="mb-4 text-[0.88rem] text-muted">
                Approved {formatWhen(member.approvedAt)} by {member.approvedBy ?? "—"}
              </p>
            )}
            <MemberReview key={member.status} id={member.id} status={member.status} />
          </Panel>

          <Panel title="Public profile" description="What others see: the members list on Team Jukti and the members directory.">
            <MemberModerationForm
              key={[member.name, member.department, member.photoUrl, member.bio, member.hideFromPublic, member.showInDirectory].join("|")}
              member={member}
            />
          </Panel>

          {isMaster && (
            <Panel title="Admin roles" description="Give this member a role in the admin panel. It applies the next time they sign in.">
              {roles.length > 0 && (
                <ul className="mb-4 grid gap-2">
                  {roles.map((r) => (
                    <li key={r} className="flex items-center justify-between gap-3 rounded-[12px] border border-glass-border px-3 py-2">
                      <span className="text-[0.92rem] text-fg">{roleInfo[r].label}</span>
                      <RevokeRoleButton email={member.email.toLowerCase()} role={r} />
                    </li>
                  ))}
                </ul>
              )}
              <GrantRolesForm email={member.email.toLowerCase()} held={roles} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words text-fg">{value}</dd>
    </div>
  );
}
