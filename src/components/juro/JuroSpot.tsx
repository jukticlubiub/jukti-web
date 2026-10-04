import { cn } from "@/lib/cn";
import type { JuroMode } from "./brain";

/**
 * An empty place in the page layout where Juro can sit. It renders nothing visible,
 * only reserves (or marks) a Juro-sized box; Juro flies to the spot of whichever
 * section is on screen and scrolls with it. Hide a spot at a breakpoint (e.g.
 * `md:hidden`) when that area isn't empty there; a section may have one spot per
 * layout, and Juro uses whichever is visible.
 *
 * `standOn`: the spot's bottom edge is a surface (like the top of a word) that Juro
 * stands on. He shrinks if needed so his head stays below the header.
 * `bubble`: which side of him his speech bubble appears on, if above him isn't free.
 *
 * Renders a block-level span so it can sit inside headings and other phrasing content.
 */
export function JuroSpot({
  name,
  standOn = false,
  bubble = "top",
  className,
}: {
  name: Exclude<JuroMode, "footer">;
  standOn?: boolean;
  bubble?: "top" | "left";
  className?: string;
}) {
  return (
    <span
      data-juro-spot={name}
      data-juro-stand={standOn || undefined}
      data-juro-bubble={bubble}
      aria-hidden
      className={cn("pointer-events-none block aspect-[5/6] w-(--juro-w)", className)}
    />
  );
}
