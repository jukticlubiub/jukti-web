import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Chip } from "@/components/ui/Chip";
import { ArrowIcon } from "@/components/ui/icons";
import { logNumber, logPath } from "@/lib/logs/text";
import { logCategoryLabels, type LogCardData } from "@/lib/logs/types";
import { AuthorLine } from "./Author";
import { LogCover } from "./LogCover";

/** The newest log, large: the story on the left, its cover on the right. */
export function FeaturedLog({ log }: { log: LogCardData }) {
  const href = logPath(log.slug);
  return (
    <section aria-labelledby="featured-log-title" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[10%] top-[20%] bottom-[-10%] rounded-[100%] bg-[radial-gradient(closest-side,rgb(120_48_18/0.75),transparent)]"
      />
      <GlassCard tilt={false} className="group relative grid overflow-hidden bg-[rgb(18_10_7/0.55)] p-2.5 sm:p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="order-2 flex flex-col gap-6 px-3 pt-6 pb-4 sm:px-5 lg:order-1 lg:justify-center lg:py-12 lg:pr-[clamp(1.5rem,3vw,3.5rem)] lg:pl-[clamp(1.75rem,3.2vw,3.75rem)]">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip>{logCategoryLabels[log.category]}</Chip>
            <span className="font-display text-[0.72rem] tracking-[0.08em] text-muted">
              Latest · {logNumber(log.number)}
            </span>
          </div>
          <h2 id="featured-log-title" className="font-heading text-[clamp(1.55rem,2.6vw,2.8rem)] leading-[1.1]">
            <Link href={href} className="transition-colors duration-300 hover:text-flare">
              {log.title}
            </Link>
          </h2>
          <p className="max-w-xl text-[clamp(1.02rem,1.2vw,1.2rem)] leading-relaxed text-body">{log.excerpt}</p>
          <AuthorLine author={log.author} meta={`${log.dateLabel} · ${log.readingMinutes} min read`} />
          <div>
            <Link href={href} className="btn-pill btn-primary">
              Read the log
              <ArrowIcon />
            </Link>
          </div>
        </div>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="relative order-1 block aspect-[16/10] overflow-hidden rounded-[14px] lg:order-2 lg:aspect-auto lg:min-h-[30rem]"
        >
          <LogCover log={log} animated priority sizes="(max-width: 1024px) 100vw, 50vw" className="transition-[scale] duration-1000 ease-reveal group-hover:scale-[1.03]" />
        </Link>
      </GlassCard>
    </section>
  );
}
