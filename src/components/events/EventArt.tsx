import { EclipseArt } from "@/components/art/EclipseArt";
import type { EventCategory } from "@/lib/events/types";

/** A word for each kind of event, etched into the cover art. */
const glyphs: Record<EventCategory, string> = {
  workshop: "</>",
  contest: "AC",
  hackathon: "24H",
  seminar: "Q&A",
  social: "GG",
  orientation: "01",
};

/** Cover art for an event without a poster. Fills its (relative) parent. */
export function EventArt({
  category,
  seed,
  animated,
  showGlyph = true,
  className,
}: {
  category: EventCategory;
  seed: string;
  animated?: boolean;
  showGlyph?: boolean;
  className?: string;
}) {
  return <EclipseArt seed={seed} glyph={showGlyph ? glyphs[category] : undefined} animated={animated} className={className} />;
}
