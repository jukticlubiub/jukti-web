import { Suspense } from "react";
import { RevokeRoleButton, GrantRolesForm } from "@/components/admin/RoleForms";
import { Cell, Empty, PageHeader, Panel, Pill, Row, Table, formatWhen, PageSkeleton } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getRoleHolders } from "@/lib/admin/data/users";
import { roleInfo } from "@/lib/admin/roles";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "People & roles" };

export default function UsersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Users />
    </Suspense>
  );
}

async function Users() {
  const admin = await requireArea("users");
  const holders = await getRoleHolders(admin);

  return (
    <>
      <PageHeader
        title="People & roles"
        description="Give club members access to the parts of the panel they manage. Access is by Google email and applies the next time they sign in."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          {holders.length === 0 ? (
            <Empty title="No one has access yet" />
          ) : (
            <Table head={["Email", "Roles"]}>
              {holders.map((h) => (
                <Row key={h.email}>
                  <Cell className="text-fg">
                    {h.email}
                    {h.email === admin.email && <span className="ml-2 text-[0.8rem] text-muted">(you)</span>}
                  </Cell>
                  <Cell>
                    <ul className="flex flex-col gap-2">
                      {h.roles.map((r) => (
                        <li key={r.role} className="flex flex-wrap items-center gap-2">
                          <Pill tone={r.role === "master_admin" ? "orange" : "grey"}>{roleInfo[r.role].label}</Pill>
                          <span className="text-[0.8rem] text-muted">since {formatWhen(r.createdAt, false)}</span>
                          <RevokeRoleButton email={h.email} role={r.role} />
                        </li>
                      ))}
                    </ul>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </div>
        <Panel title="Grant access" description="Someone can hold several roles. A Master Admin can do everything.">
          <GrantRolesForm />
        </Panel>
      </div>
    </>
  );
}
