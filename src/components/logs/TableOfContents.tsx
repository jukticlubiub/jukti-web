"use client";

import { useLenis } from "lenis/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { LogHeading } from "@/lib/logs/types";

/** Where a heading counts as "being read": this far down the screen. */
const READING_LINE = 0.3;

/** Scrolls to a heading smoothly (through Lenis when it's running) and records it in the URL. */
function useJumpToHeading() {
  const lenis = useLenis();
  return (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    // The headings' scroll-margin keeps them clear of the header (Lenis honors it too).
    if (lenis) lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };
}

/**
 * "On this page" beside the article, highlighting the section being read. Hidden
 * below xl, where the collapsible version at the top of the article is used instead.
 */
export function TableOfContents({ headings }: { headings: LogHeading[] }) {
  const [active, setActive] = useState<string | null>(null);
  const jump = useJumpToHeading();

  useEffect(() => {
    const elements = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * READING_LINE;
        let current: string | null = null;
        for (const el of elements) {
          if (el.getBoundingClientRect().top <= line) current = el.id;
          else break;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [headings]);

  return (
    <nav aria-label="On this page" className="text-[0.92rem]">
      <p className="text-[0.75rem] font-medium tracking-[0.18em] text-muted uppercase">On this page</p>
      <ol className="mt-5 space-y-1 border-l border-glass-border">
        {headings.map((h) => {
          const isActive = h.id === active;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => jump(e, h.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l py-1.5 leading-snug transition-colors duration-200",
                  h.depth === 3 ? "pl-7" : "pl-4",
                  isActive ? "border-flare text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The same contents as a collapsible list at the top of the article, for narrower screens. */
export function InlineContents({ headings }: { headings: LogHeading[] }) {
  const jump = useJumpToHeading();
  return (
    <details className="group glass-card mb-12 px-5 py-4 xl:hidden">
      <summary className="flex list-none items-center justify-between gap-4 text-[0.8rem] font-medium tracking-[0.16em] text-body uppercase [&::-webkit-details-marker]:hidden">
        On this page
        <span aria-hidden className="text-lg leading-none text-flare transition-transform duration-300 group-open:rotate-45">
          +
        </span>
      </summary>
      <ol className="mt-4 space-y-2.5 border-t border-glass-border pt-4 text-[0.98rem]">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "pl-4" : undefined}>
            <a href={`#${h.id}`} onClick={(e) => jump(e, h.id)} className="text-body transition-colors hover:text-flare">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
