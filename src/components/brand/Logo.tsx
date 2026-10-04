import { cn } from "@/lib/cn";
import { LOGO_VIEWBOX, MARK_PIECES, MARK_VIEWBOX, TAGLINE_PATHS, WORDMARK_PATHS } from "./logo-paths";

type LogoProps = { className?: string; title?: string };

const markPaths = Object.values(MARK_PIECES);

/** The Jukti mark on its own. Drawn in `currentColor`, so set the color with a text utility. */
export function LogoMark({ className, title = "Jukti" }: LogoProps) {
  return (
    <svg viewBox={MARK_VIEWBOX} fill="currentColor" role="img" aria-label={title} className={cn("h-auto", className)}>
      {markPaths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** The full lockup: mark, JUKTI wordmark, and the "Club of CSE, IUB" line. */
export function Logo({ className, title = "Jukti, Club of CSE, IUB" }: LogoProps) {
  return (
    <svg viewBox={LOGO_VIEWBOX} fill="currentColor" role="img" aria-label={title} className={cn("h-auto", className)}>
      {[...markPaths, ...WORDMARK_PATHS, ...TAGLINE_PATHS].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
