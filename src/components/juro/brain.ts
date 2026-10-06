/**
 * Shared, mutable state between the page (DOM events) and Juro's 3D rig.
 * Written by event listeners, read every frame; never drives React renders.
 */
export type JuroMode = "hero" | "history" | "community" | "footer";

type Point = { x: number; y: number };

export type JuroBrain = {
  /** Last mouse position in client px, or null on touch devices / before the mouse moves. */
  pointer: Point | null;
  /** Something on the page Juro turns his head toward (the text he reads, the button he points at), client px. */
  focus: Point | null;
  /** Page scroll speed in px/s (positive = scrolling down). Decays when scrolling stops. */
  scrollVelocity: number;
  /** Which homepage section is in the middle of the screen. */
  mode: JuroMode;
  /** No free spot on screen for him (e.g. the footer): he ducks out of view. */
  away: boolean;
  /** He has vanished (scrolling back up): don't draw him. */
  hidden: boolean;
  /** Bump to replay his entrance: popping up from below and waving hello, as on page load. */
  enterId: number;
  /**
   * How sharply to draw him, as a share of the screen's pixel density (0..1). His canvas
   * always has the peek's size and is scaled down on screen; when he's small it's drawn at
   * a lower resolution to match, instead of being resized (which would flicker).
   */
  resolution: number;
  hovered: boolean;
  /** What he says when he pops up and waves hello. */
  greeting: string;
  /** Bump the id to make Juro wave, with what his speech bubble says. */
  waveRequest: { id: number; message: string };
  reducedMotion: boolean;
  /** Set by the page: shows (or hides, with null) Juro's speech bubble. */
  say: (message: string | null) => void;
};

export function createBrain(): JuroBrain {
  return {
    pointer: null,
    focus: null,
    scrollVelocity: 0,
    mode: "hero",
    away: false,
    hidden: false,
    enterId: 0,
    resolution: 1,
    hovered: false,
    greeting: "Hi, I'm Juro!",
    waveRequest: { id: 0, message: "" },
    reducedMotion: false,
    say: () => {},
  };
}
