import { Suspense } from "react";
import { ChapterForm, EditableItem, SortableList } from "@/components/admin/ContentForms";
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
        <SortableList
          table="story_chapters"
          items={chapters.map((c, i) => ({
            id: c.id,
            node: (
              <EditableItem table="story_chapters" id={c.id} title={`${String(i + 1).padStart(2, "0")}. ${c.title}`} subtitle={c.kicker} imageUrl={c.photoUrl} shown={c.published}>
                <ChapterForm chapter={c} live={live} />
              </EditableItem>
            ),
          }))}
        />
        <Panel title="Add a chapter" description="It’s added at the end; drag it into place afterwards.">
          <ChapterForm live={live} />
        </Panel>
      </div>
    </>
  );
}
