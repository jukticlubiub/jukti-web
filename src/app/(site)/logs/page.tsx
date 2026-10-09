import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { FeaturedLog } from "@/components/logs/FeaturedLog";
import { LogsBrowser } from "@/components/logs/LogsBrowser";
import { RssIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { getLogs } from "@/lib/logs/queries";
import { toLogCard } from "@/lib/logs/text";
import { joinLink } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Jukti Logs", description: "Tutorials, event recaps, career advice and stories from JUKTI, the Club of CSE at IUB, written by the people in it.", path: "/logs" }),
  alternates: { canonical: "/logs", types: { "application/rss+xml": [{ url: "/logs/feed.xml", title: "Jukti Logs" }] } },
};

export default async function LogsPage() {
  const cards = (await getLogs()).map(toLogCard);
  const featured = cards[0] ?? null;

  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      <section aria-labelledby="logs-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
        <h1 id="logs-title" className="font-heading text-[clamp(2.1rem,5.87vw,7.4rem)]">
          <MaskReveal>
            JUKTI <span className="text-flare">LOGS</span>
          </MaskReveal>
        </h1>
        <Reveal
          as="p"
          delay={0.15}
          className="mt-[0.35em] text-[clamp(1.1rem,2.6vw,3rem)] leading-tight font-light tracking-[-0.03em] text-fg"
        >
          Notes from the JUKTIverse
        </Reveal>
        <Reveal delay={0.25} className="mt-7 flex justify-center">
          <a href="/logs/feed.xml" className="btn-pill btn-ghost text-[0.8rem]">
            <RssIcon className="text-flare" />
            Follow via RSS
          </a>
        </Reveal>
      </section>

      <div className="relative mx-auto grid max-w-[92rem] gap-[clamp(5rem,9vw,10rem)] px-5 pt-[clamp(3rem,5vw,6rem)] lg:px-[clamp(2rem,4vw,5rem)]">
        {featured ? <FeaturedLog log={featured} /> : <NothingYet />}
        {cards.length > 1 && <LogsBrowser logs={cards} featuredSlug={featured?.slug ?? null} />}
      </div>
    </div>
  );
}

function NothingYet() {
  return (
    <div className="glass-card mx-auto max-w-3xl px-6 py-14 text-center sm:px-12">
      <h2 className="font-heading text-[clamp(1.4rem,2.4vw,2.2rem)]">The first log is on its way</h2>
      <p className="mx-auto mt-4 max-w-xl text-lg text-body">
        Tutorials, recaps and stories from the club will be published here. Join JUKTI to be part of them.
      </p>
      <Link href={joinLink.href} className="btn-pill btn-primary mt-8">
        {joinLink.label}
      </Link>
    </div>
  );
}
