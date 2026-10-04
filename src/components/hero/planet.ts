/**
 * Eclipse geometry, measured from the homepage design (1863px wide): the planet's
 * top sits at 39.5% of the width and its radius is 93.4% of the width, so the arc
 * meets the screen edges just below the fold. On tall or narrow screens the
 * height-based limits keep the arc low and wide enough to read as a horizon.
 *
 * The CSS fallback in HeroBackdrop mirrors these numbers:
 *   --planet-top: clamp(56svh, 39.5cqw, 72svh)
 *   --planet-r:   max(93.4cqw, 85svh)
 */
export function planetGeometry(width: number, height: number) {
  const top = Math.min(Math.max(0.395 * width, 0.56 * height), 0.72 * height);
  const radius = Math.max(0.934 * width, 0.85 * height);
  return { top, radius };
}

/** The backdrop runs this far past the hero (as a fraction of its height) so the planet flows into Our History. */
export const HERO_TAIL = 0.3;

/** Width of one ribbed-glass stripe, matching `--rib` in globals.css. */
export function ribWidth(width: number) {
  return width <= 640 ? 24 : 32;
}
