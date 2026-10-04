import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AuthorAvatar, AuthorLine } from "@/components/logs/Author";
import { LogCard } from "@/components/logs/LogCard";
import { LogCover } from "@/components/logs/LogCover";
import { LogMarkdown } from "@/components/logs/LogMarkdown";
import { ReadingProgress } from "@/components/logs/ReadingProgress";
import { InlineContents, TableOfContents } from "@/components/logs/TableOfContents";
import { Chip } from "@/components/ui/Chip";
import { ArrowIcon, ArrowLeftIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShareButton } from "@/components/ui/ShareButton";
import { formatLogDate } from "@/lib/logs/format";
import { getLog, getLogs, getRelatedLogs } from "@/lib/logs/queries";
import { logHeadings, logNumber, logPath, toLogCard } from "@/lib/logs/text";
import { type JuktiLog, logCategoryLabels } from "@/lib/logs/types";
import { site } from "@/lib/site";

// A slug that never matches, for builds with no logs yet: Cache Components needs at
// least one param to validate the route. It renders the 404 page.
const NO_LOGS = "__no-logs__";

export async function generateStaticParams() {
  const logs = await getLogs();
  return logs.length ? logs.map((log) => ({ slug: log.slug })) : [{ slug: NO_LOGS }];
}

export async function generateMetadata({ params }: PageProps<"/logs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const log = await getLog(slug);
  if (!log) return { title: "Log not found" };
  return {
    title: log.title,
    description: log.excerpt,
    authors: [{ name: log.author.name }],
    alternates: { types: { "application/rss+xml": [{ url: "/logs/feed.xml", title: "Jukti Logs" }] } },
    openGraph: {
      type: "article",
      title: log.title,
      description: log.excerpt,
      publishedTime: log.publishedAt,
      modifiedTime: log.updatedAt,
      authors: [log.author.name],
      section: logCategoryLabels[log.category],
      images: log.cover ? [{ url: log.cover.url, alt: log.cover.alt }] : undefined,
    },
  };
}

export default function LogPage({ params }: PageProps<"/logs/[slug]">) {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <Suspense fallback={<ArticleSkeleton />}>
        <LogArticle params={params} />
      </Suspense>
    </div>
  );
}

const container = "relative mx-auto max-w-[92rem] px-5 lg:px-[clamp(2rem,4vw,5rem)]";

async function LogArticle({ params }: Pick<PageProps<"/logs/[slug]">, "params">) {
  const { slug } = await params;
  const log = await getLog(slug);
  if (!log) notFound();

  const path = logPath(slug);
  const headings = logHeadings(log.body);
  const related = await getRelatedLogs(log);
  const meta = `${formatLogDate(log.publishedAt)} · ${log.readingMinutes} min read`;

  return (
    <>
      <ReadingProgress targetId="log-body" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(log, `${site.url}${path}`)).replace(/</g, "\\u003c") }}
      />

      <article>
        <header className={`${container} pt-[clamp(8rem,11vw,12rem)]`}>
          <Link href="/logs" className="inline-flex items-center gap-2 text-[0.95rem] text-muted transition-colors hover:text-fg">
            <ArrowLeftIcon />
            All logs
          </Link>
          <div className="mx-auto mt-10 max-w-5xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Chip>{logCategoryLabels[log.category]}</Chip>
              <span className="font-display text-[0.72rem] tracking-[0.08em] text-muted">{logNumber(log.number)}</span>
            </div>
            <h1 className="mt-7 font-heading text-[clamp(1.9rem,4vw,4.3rem)] leading-[1.08]">
              <MaskReveal>{log.title}</MaskReveal>
            </h1>
            <Reveal as="p" immediate delay={0.25} className="mx-auto mt-7 max-w-3xl text-[clamp(1.1rem,1.4vw,1.4rem)] leading-relaxed text-body">
              {log.excerpt}
            </Reveal>
            <Reveal immediate delay={0.35} className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
              <AuthorLine author={log.author} meta={log.author.role ?? meta} className="text-left" />
              {log.author.role && <p className="text-[0.95rem] text-muted">{meta}</p>}
              <ShareButton title={log.title} path={path} />
            </Reveal>
          </div>
        </header>

        <Reveal immediate delay={0.2} className={`${container} mt-[clamp(3rem,5vw,5rem)]`}>
          <div className="glass-card mx-auto max-w-6xl p-2.5">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] sm:aspect-[21/9]">
              <LogCover log={log} animated priority sizes="(max-width: 1200px) 100vw, 72rem" />
            </div>
          </div>
        </Reveal>

        <div className={`${container} mt-[clamp(3.5rem,6vw,6rem)] grid justify-center gap-x-[clamp(2.5rem,4vw,5rem)] xl:grid-cols-[13rem_minmax(0,44rem)_13rem]`}>
          <aside className="hidden xl:block">
            {headings.length > 1 && (
              <div className="sticky top-32">
                <TableOfContents headings={headings} />
              </div>
            )}
          </aside>

          <div id="log-body" className="min-w-0 max-w-[44rem]">
            {headings.length > 2 && <InlineContents headings={headings} />}
            <LogMarkdown markdown={log.body} />

            <div className="glass-card mt-16 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
              <AuthorAvatar author={log.author} className="size-14" />
              <div className="min-w-0">
                <p className="text-[0.75rem] font-medium tracking-[0.18em] text-flare uppercase">Written by</p>
                <p className="mt-1.5 text-[1.15rem] text-fg">{log.author.name}</p>
                {log.author.role && <p className="mt-0.5 text-muted">{log.author.role}</p>}
              </div>
              <ShareButton title={log.title} path={path} className="sm:ml-auto" />
            </div>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-32 space-y-3">
              <p className="text-[0.75rem] font-medium tracking-[0.18em] text-muted uppercase">{log.readingMinutes} min read</p>
              <ShareButton title={log.title} path={path} className="w-full" />
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="more-logs-title" className={`${container} mt-[clamp(5rem,9vw,10rem)]`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading id="more-logs-title" title="Keep Reading" />
            <Link href="/logs" className="btn-pill btn-ghost text-[0.85rem]">
              All logs
              <ArrowIcon />
            </Link>
          </div>
          <ul className="mt-[clamp(2rem,3vw,3.25rem)] grid gap-[clamp(1rem,1.6vw,1.75rem)] sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other, i) => (
              <Reveal as="li" key={other.id} delay={i * 0.06}>
                <LogCard log={toLogCard(other)} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ArticleSkeleton() {
  const block = "rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse";
  return (
    <div aria-hidden className={`${container} pt-[clamp(10rem,14vw,14rem)]`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className={`${block} mx-auto h-8 w-40 rounded-full`} />
        <div className={`${block} h-32`} />
      </div>
      <div className={`${block} mx-auto mt-16 aspect-[21/9] max-w-6xl`} />
    </div>
  );
}

/** schema.org BlogPosting, so search engines can show the author and date. */
function structuredData(log: JuktiLog, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: log.title,
    description: log.excerpt,
    datePublished: log.publishedAt,
    dateModified: log.updatedAt,
    articleSection: logCategoryLabels[log.category],
    author: { "@type": /^jukti\b/i.test(log.author.name) ? "Organization" : "Person", name: log.author.name },
    publisher: { "@type": "Organization", name: site.fullName, url: site.url },
    image: log.cover ? [log.cover.url] : undefined,
    mainEntityOfPage: url,
    url,
  };
}
