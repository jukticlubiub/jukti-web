import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { StoryMap } from "@/components/about/StoryMap";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { getStoryChapters } from "@/lib/content/queries";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "The story of JUKTI, the Club of CSE at IUB: an idea on a trip to Kuakata, a name that means logic, founded in 2014, and the largest CSE community at IUB today.",
  path: "/about",
});

export default async function AboutPage() {
  const storyChapters = await getStoryChapters();
  return (
    <div className="relative overflow-x-clip">
      <PageBackdrop />
      {/* A low warm glow at the foot of the page, where the line ends. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[60rem] bg-[radial-gradient(60%_50%_at_70%_100%,rgb(120_48_18/0.65),transparent)]" />
      <StoryMap chapters={storyChapters} />
    </div>
  );
}
