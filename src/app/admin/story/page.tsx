import { Suspense } from "react";
import { ChapterForm, EditableItem } from "@/components/admin/ContentForms";
import { PageHeader, PageSkeleton, Panel } from "@/components/admin/ui";
import { requireArea } from "@/lib/admin/access";
import { listStoryForAdmin } from "@/lib/admin/data/content";

// Signed out, the layout shows the sign-in screen instead of this page (see admin/layout.tsx).
export const instant = false;

export const metadata = { title: "About story" };

export default function StoryAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Story />
    </Suspense>
  );
}

async function Story() {
  const admin = await requireArea("story");
  const chapters = await listStoryForAdmin(admin);
  const live = admin.mode === "live";
  return (
    <>
      <PageHeader title="About story" description="The chapters of the story map on /about, in order. Each chapter’s photo starts in black and white and fills with colour as the story reaches it.">
        <a href="/about" target="_blank" rel="noreferrer" className="btn-pill btn-ghost text-[0.8rem]">
          View page ↗
        </a>
      </PageHeader>
      <div className="grid gap-8">
        <ul className="grid gap-2">
          {chapters.map((c, i) => (
            <EditableItem key={c.id} table="story_chapters" id={c.id} title={`${String(i + 1).padStart(2, "0")}. ${c.title}`} subtitle={c.kicker} imageUrl={c.photoUrl} shown={c.published} first={i === 0} last={i === chapters.length - 1}>
              <ChapterForm chapter={c} live={live} />
            </EditableItem>
          ))}
        </ul>
        <Panel title="Add a chapter" description="It’s added at the end; move it into place afterwards.">
          <ChapterForm live={live} />
        </Panel>
      </div>
    </>
  );
}
