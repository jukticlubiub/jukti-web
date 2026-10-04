import Image from "next/image";
import { EclipseArt } from "@/components/art/EclipseArt";
import { cn } from "@/lib/cn";
import type { JuktiLog, LogCategory } from "@/lib/logs/types";

/** A word for each kind of log, etched into the cover art. */
const glyphs: Record<LogCategory, string> = {
  tutorial: "{ }",
  news: "NEW",
  recap: "REC",
  career: "CV",
  research: "R&D",
  story: "Aa",
};

/** The log's cover image, or the site's eclipse art when there isn't one. Fills its parent. */
export function LogCover({
  log,
  sizes,
  animated,
  priority,
  className,
}: {
  log: Pick<JuktiLog, "slug" | "category" | "cover">;
  sizes: string;
  animated?: boolean;
  priority?: boolean;
  className?: string;
}) {
  if (log.cover) {
    return (
      <Image src={log.cover.url} alt={log.cover.alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />
    );
  }
  return <EclipseArt seed={`log:${log.slug}`} glyph={glyphs[log.category]} animated={animated} className={className} />;
}
