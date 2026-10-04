import { Suspense } from "react";
import { FacultyForm, FacultyRow } from "@/components/admin/AcademicForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listFacultyForAdmin } from "@/lib/admin/data/academic";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Faculty directory" };

export default function FacultyAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Faculty />
    </Suspense>
  );
}

async function Faculty() {
  const admin = await requireArea("faculty");
  const faculty = await listFacultyForAdmin(admin);
  return (
    <>
      <PageHeader
        title="Faculty directory"
        description="The CSE faculty shown on /helpline/faculty. Everyone listed and set to receive emails is notified about new helpline questions, and can answer as Faculty."
      >
        <a href="/helpline/faculty" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          View directory ↗
        </a>
      </PageHeader>
      <div className="grid gap-8">
        <ul className="grid gap-2">
          {faculty.map((f) => (
            <FacultyRow key={f.id} faculty={f} />
          ))}
        </ul>
        <Panel title="Add someone">
          <FacultyForm nextPosition={faculty.length} />
        </Panel>
      </div>
    </>
  );
}
