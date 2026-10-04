import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/cn";
import { logNumber, logPath } from "@/lib/logs/text";
import { logCategoryLabels, type LogCardData } from "@/lib/logs/types";
import { AuthorLine } from "./Author";
import { LogCover } from "./LogCover";

/** A log as a glass card: cover with its log number, category and reading time, title, excerpt, author. */
export function LogCard({ log, className }: { log: LogCardData; className?: string }) {
  return (
    <GlassCard className={cn("group h-full overflow-hidden", className)}>
      <Link href={logPath(log.slug)} className="flex h-full flex-col rounded-[inherit]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-[inherit]">
          <LogCover
            log={log}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
            className="transition-[scale] duration-700 ease-reveal group-hover:scale-[1.04]"
          />
          <span className="absolute top-3 left-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 font-display text-[0.68rem] tracking-[0.08em] text-fg backdrop-blur-md">
            {logNumber(log.number)}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-[0.78rem] font-medium tracking-[0.12em] text-muted uppercase">
            <span className="text-flare">{logCategoryLabels[log.category]}</span>
            <span aria-hidden> · </span>
            {log.readingMinutes} min read
          </p>
          <h3 className="mt-3 font-heading text-[clamp(1.05rem,1.35vw,1.3rem)] leading-[1.25] tracking-[-0.01em] transition-colors duration-300 group-hover:text-flare">
            {log.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-[0.98rem] leading-relaxed text-body/85">{log.excerpt}</p>
          <div className="mt-auto pt-6">
            <AuthorLine author={log.author} meta={log.dateLabel} className="border-t border-glass-border pt-5" />
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}
