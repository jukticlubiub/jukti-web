import { Suspense } from "react";
import { SocialsForm } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { getSocials } from "@/lib/content/queries";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireArea("settings");
  const socials = await getSocials();
  return (
    <>
      <PageHeader title="Settings" description="Site-wide details. Where emails are delivered is set by the server’s environment variables (see .env.example)." />
      <Panel title="Social links" description="Shown in the footer and on the Contact page.">
        <SocialsForm socials={socials} />
      </Panel>
    </>
  );
}
