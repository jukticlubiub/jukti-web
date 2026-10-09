"use client";

import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useHasWebGL } from "@/components/ui/useHasWebGL";
import { useIdle } from "@/components/ui/useIdle";
import { createBrain, type JuroBrain, type JuroMode } from "./brain";
import { peekDistance } from "./peek";

const JuroCanvas = dynamic(() => import("./JuroCanvas"), { ssr: false });

/**
 * Juro's route down the homepage, after he leaves his opening peek: one spot per section,
 * in page order (see JuroSpot).
 */
const ROUTE = ["history", "community"] as const;

/** What Juro turns his head toward in each section: the text he reads, the button he points at. */
const FOCUS: Partial<Record<JuroMode, string>> = {
  history: "#history p:last-of-type",
  community: 'section[aria-labelledby="community-title"] a[href="/join"]',
};

const INVITE = "Join us!";
const INVITE_MS = 3000;
/** The shortest stretch of scrolling a handoff between two spots takes, × the screen height. */
const MIN_HANDOFF = 0.35;
/** How far he may travel, on average, per pixel scrolled while gliding between spots. */
const MAX_GLIDE_SPEED = 1.2;
/** How far from the bottom of the screen he stays while gliding (px). */
const BOTTOM_MARGIN_PX = 12;
/** Room kept below the header (px). */
const HEADER_GAP_PX = 8;
/** The header turns compact once the page has scrolled this far (see Header.tsx). */
const COMPACT_HEADER_AFTER_PX = 40;
/** While gliding he keeps to the page's side margin, this far from the screen edge (px). */
const SIDE_GAP_PX = 16;
/** Radius of the rounded corners on his glide path (px). */
const TURN_RADIUS_PX = 70;
/** The most of a glide spent on each sideways run (out to the margin, back in to a spot). */
const MAX_SIDEWAYS_SHARE = 0.25;
/** How quickly he catches up with the page when it jumps or scrolls unevenly (per second). */
const FOLLOW_RATE = 16;
/** He ducks out once the footer (which has no free spot) fills this much of the screen. */
const FOOTER_SHARE = 0.4;
/** While his first spot scrolls into view, he steps in to it from the side margin over this much scrolling (× screen height). */
const STEP_IN = 0.25;
/** Scrolling back up this far past his first spot (× screen height) makes him vanish (a nudge doesn't). */
const EXIT_AFTER = 0.04;
/** How long vanishing (or reappearing) in place takes. */
const VANISH_MS = 280;
/** After popping back up at the top, how quickly the peek hands over to his path once the page scrolls down (per second). */
const HOLD_RELEASE_RATE = 5;

/** Where Juro's box goes on screen (client px); `w` is his width, height is 1.2 × w. */
type Box = { x: number; y: number; w: number };

type Rig = {
  /** Where he is along ROUTE: 0.5 = halfway from the first spot to the second. Null until placed. */
  g: number | null;
  /** 0 = on his path, 1 = vanished. */
  out: number;
  /** Vanishing (true) or reappearing (false). */
  leaving: boolean;
  /** Where he was when he started vanishing: he shrinks away there, whatever the page does. */
  vanishFrom: Box | null;
  /** Where he was placed last frame (before any vanishing), so a jump in the page doesn't move where he vanishes. */
  lastBox: Box | null;
  /** He has left the peek (reached the end of the hero's pin) since last popping up at the top. */
  leftPeek: boolean;
  /** He has reached his first spot since last popping up at the top. */
  arrived: boolean;
  /** 1 = showing the full peek (after popping back up), whatever the scroll position. */
  hold: number;
  releasing: boolean;
  lastY: number;
  standW: Map<HTMLElement, number>; // width on standing spots, measured at the top of the page
  headerBottom: number; // the full header's bottom edge, measured at the top of the page
  compactHeaderBottom: number; // the scrolled (compact) header's bottom edge, once it has shrunk
  bubbleSide: "top" | "left";
  canvasW: number; // his box's layout width: always the peek's (he's scaled down from it), 0 until set
  resolution: number; // last value given to the brain
};

/*
 * Juro's canvas leaves transparent margin around him: about 19% of the box above his
 * head and 20% below his body. When he stands on something, the margin below overlaps
 * it harmlessly; the margin above may reach toward the header, but his head may not.
 */
const HEAD_MARGIN = 0.19;
const FEET_MARGIN = 0.2;
/** His body starts this far in from either side of the box. */
const BODY_SIDE = 0.24;
const MIN_STANDING_W = 80;
/** Used until the header has been measured (e.g. the page loaded already scrolled). */
const FALLBACK_HEADER_PX = 110;
/** Room a side bubble needs to his left (its widest message plus a margin). */
const BUBBLE_ROOM_PX = 150;

/*
 * Opening shot: at the top of the page a big Juro peeks up from the bottom centre of the
 * screen, only his head (and waving hand) above the edge. Measured from his canvas: his
 * head spans 20.7%–51% of the box height and 38.6% of its width.
 */
const HEAD_WIDTH_FRACTION = 0.386;
const NECK_FRACTION = 0.51;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** The peek: head about a quarter of the screen wide (kept clear of the hero text), neck at the bottom edge. */
function peekBox(vw: number, vh: number): Box {
  const headW = Math.min(400, Math.max(170, Math.min(0.24 * vw, 0.34 * vh)));
  const w = headW / HEAD_WIDTH_FRACTION;
  const h = w * 1.2;
  return { x: vw / 2 - w / 2, y: vh - (NECK_FRACTION + 0.01) * h, w };
}

/**
 * Leaving the peek (while the hero is pinned): he sinks toward the bottom edge as he
 * shrinks, then slides along it to where his path down the page starts.
 */
function depart(peek: Box, to: Box, k: number): Box {
  const shrink = smoothstep(clamp01(k / 0.7));
  const slide = smoothstep(clamp01((k - 0.25) / 0.75));
  const w = peek.w + (to.w - peek.w) * shrink;
  const [fromX, fromY] = [peek.x + peek.w / 2, peek.y + peek.w * 0.6];
  const [toX, toY] = [to.x + to.w / 2, to.y + to.w * 0.6];
  const cx = fromX + (toX - fromX) * slide;
  const cy = fromY + (toY - fromY) * shrink;
  return { x: cx - w / 2, y: cy - w * 0.6, w };
}

/** A box `k` of the way from `a` to `b`. */
const mixBox = (a: Box, b: Box, k: number): Box => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k });

/** Starts with a small wind-up the other way, then speeds off. */
function easeInBack(t: number) {
  const c = 1.70158;
  return (c + 1) * t ** 3 - c * t ** 2;
}

/**
 * Vanishing in place: a tiny swell, then shrinking into the middle of his body.
 * `v` is 0 (all there) to 1 (gone); he also fades out (see the opacity below).
 */
function poof(box: Box, v: number): Box {
  const h = box.w * 1.2;
  const [cx, cy] = [box.x + box.w / 2, box.y + 0.55 * h];
  const w = box.w * (1 - 0.65 * easeInBack(v));
  return { x: cx - w / 2, y: cy - 0.55 * w * 1.2, w };
}

/**
 * Where he waits for a spot that hasn't scrolled into view yet: in the page's side
 * margin nearest to it (clear of the centred content), or right below it when it's centred.
 */
function waitX(spot: Box, vw: number) {
  const centre = spot.x + spot.w / 2;
  if (centre > vw * 0.6) return Math.max(spot.x, vw - SIDE_GAP_PX - (1 - BODY_SIDE) * spot.w);
  if (centre < vw * 0.4) return Math.min(spot.x, SIDE_GAP_PX - BODY_SIDE * spot.w);
  return spot.x;
}

/** The first spot for this section that is actually laid out (spots can be hidden per breakpoint). */
function visibleSpot(name: string) {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-juro-spot="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * How wide Juro can be standing on a spot, so his head stays below the header.
 * Only meaningful with the page at the top: the header shrinks once you scroll, and
 * the hero text slides away, so the result is measured there and kept.
 */
function standingWidth(spot: HTMLElement, headerBottom: number) {
  const r = spot.getBoundingClientRect();
  const fitH = (r.bottom - headerBottom - 8) / (1 - HEAD_MARGIN - FEET_MARGIN);
  return Math.max(MIN_STANDING_W, Math.min(r.width, fitH / 1.2));
}

/**
 * The box Juro fills for a spot. A normal spot is the box. A standing spot's bottom
 * edge is the surface he stands on: he's centred on it with his body resting on it,
 * at the width measured for it (see `standingWidth`).
 */
function boxFor(spot: HTMLElement, standW: Map<HTMLElement, number>): Box {
  const r = spot.getBoundingClientRect();
  if (!spot.dataset.juroStand) return { x: r.left, y: r.top, w: r.width };
  const w = standW.get(spot) ?? r.width;
  const h = w * 1.2;
  return { x: r.left + r.width / 2 - w / 2, y: r.bottom + FEET_MARGIN * h - h, w };
}

function centerOf(selector: string | undefined) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** The top and bottom of his visible body inside the box (the rest is transparent margin). */
const bodyTop = (box: Box) => box.y + HEAD_MARGIN * box.w * 1.2;
const bodyBottom = (box: Box) => box.y + (1 - FEET_MARGIN) * box.w * 1.2;

/** The box moved (vertically) just enough to keep his body between `top` and `bottom`. */
function keepInView(box: Box, top: number, bottom: number): Box {
  const h = box.w * 1.2;
  const minY = top - HEAD_MARGIN * h;
  const maxY = bottom - (1 - FEET_MARGIN) * h;
  return { ...box, y: Math.min(Math.max(box.y, minY), Math.max(minY, maxY)) };
}

/**
 * The stretch of scrolling (in window.scrollY terms) over which he glides from spot `a`
 * to the next spot `b`. It starts when `a` (moving up as the page scrolls down) would
 * reach the header, so he never rides a spot under it, and lasts until `b` is fully in
 * view, or longer if the trip is far, so he never moves much faster than the page.
 * When both spots are on screen together, it starts halfway through that overlap.
 * It only depends on where the spots are, so scrolling back retraces it exactly.
 */
function handoffZone(a: Box, b: Box, top: number, bottom: number, minLength: number): [number, number] {
  const x = -bodyTop(a); // grows one-for-one with window.scrollY
  const x0 = -top; // `a` reaches the header
  const x1 = -(bottom - (bodyBottom(b) - bodyTop(a))); // `b` is fully above the bottom edge
  const side = sideX(a, b);
  const travel = Math.abs(side - a.x) + Math.abs(side - b.x) + Math.max(0, bottom - top - (bodyBottom(b) - bodyTop(b)));
  // (out to the side margin, along it the height of the screen, and in to `b`)
  const length = Math.max(minLength, travel / MAX_GLIDE_SPEED);
  const start = x1 - x0 >= length ? x0 : Math.min(x0, (x0 + x1) / 2);
  const end = Math.max(x1, start + length);
  return [window.scrollY + start - x, window.scrollY + end - x];
}

/**
 * The x he glides along between two spots: out in the page's side margin, on the side
 * of the spot he's heading to (never further in than either spot), so while gliding
 * (or when the page stops mid-glide) he stays clear of the centred content.
 */
function sideX(from: Box, to: Box) {
  const vw = document.documentElement.clientWidth;
  if (to.x + to.w / 2 > vw / 2) return Math.max(from.x, to.x, vw - SIDE_GAP_PX - (1 - BODY_SIDE) * to.w);
  return Math.min(from.x, to.x, SIDE_GAP_PX - BODY_SIDE * to.w);
}

type Point = { x: number; y: number };

/** The point `d` px along a polyline whose corners are rounded (quadratic curves of radius up to `radius`). */
function alongRounded(points: Point[], radius: number, d: number): Point {
  // Break the polyline into straight runs and corner curves: [start, control, end] each.
  const parts: [Point, Point, Point][] = [];
  const toward = (a: Point, b: Point, dist: number) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: a.x + ((b.x - a.x) / len) * dist, y: a.y + ((b.y - a.y) / len) * dist };
  };
  let from = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, corner, next] = [points[i - 1], points[i], points[i + 1]];
    const r = Math.min(radius, Math.hypot(corner.x - prev.x, corner.y - prev.y) / 2, Math.hypot(next.x - corner.x, next.y - corner.y) / 2);
    const inPoint = toward(corner, prev, r);
    const outPoint = toward(corner, next, r);
    parts.push([from, from, inPoint]);
    parts.push([inPoint, corner, outPoint]);
    from = outPoint;
  }
  parts.push([from, from, points[points.length - 1]]);

  const at = ([p0, c, p1]: [Point, Point, Point], k: number) => ({
    x: (1 - k) ** 2 * p0.x + 2 * (1 - k) * k * c.x + k ** 2 * p1.x,
    y: (1 - k) ** 2 * p0.y + 2 * (1 - k) * k * c.y + k ** 2 * p1.y,
  });
  const length = (part: [Point, Point, Point]) => {
    let sum = 0;
    let prev = part[0];
    for (let i = 1; i <= 8; i++) {
      const p = at(part, i / 8);
      sum += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
    }
    return sum;
  };

  let left = d;
  for (const part of parts) {
    const len = length(part);
    if (left <= len || part === parts[parts.length - 1]) return at(part, len ? Math.min(1, left / len) : 1);
    left -= len;
  }
  return points[points.length - 1];
}

/**
 * Where he is `k` (0..1) of the way from `from` to `to`: out to the side margin, along
 * it, and in to the spot, with rounded corners. The sideways runs are kept short (they
 * cross whatever is on screen at the time); the long run is in the margin.
 */
function glide(from: Box, to: Box, k: number): Box {
  const side = sideX(from, to);
  const points = [
    { x: from.x, y: from.y },
    { x: side, y: from.y },
    { x: side, y: to.y },
    { x: to.x, y: to.y },
  ];
  const [out, along, back] = [0, 1, 2].map((i) => Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y));
  const total = out + along + back || 1;
  const outShare = Math.min(MAX_SIDEWAYS_SHARE, out / total);
  const backShare = Math.min(MAX_SIDEWAYS_SHARE, back / total);
  const alongShare = 1 - outShare - backShare;
  // How far along the path he is, running each part in its share of the glide.
  const d =
    k < outShare
      ? (k / outShare) * out
      : k < outShare + alongShare
        ? out + ((k - outShare) / (alongShare || 1)) * along
        : out + along + ((k - outShare - alongShare) / (backShare || 1)) * back;
  const p = alongRounded(points, TURN_RADIUS_PX, d);
  return { x: p.x, y: p.y, w: from.w + (to.w - from.w) * k };
}

/**
 * Juro, the JUKTI mascot. At the top of the page he peeks up big from the bottom edge
 * and waves; scrolling takes him down onto his path, which runs through empty spots in
 * the page layout (`JuroSpot`): he rides each section's spot as it scrolls by and glides
 * to the next one in step with the scroll, so he never covers content for long. Scrolling
 * back up retraces the path until his first spot; past it he vanishes where he is, and pops
 * up big at the top again once the hero is back. He waves hello on arrival,
 * follows the cursor with his eyes, leans with the scroll, reads along in Our History,
 * points at Join Us, and waves goodbye at the footer (which has no free spot) before
 * ducking out. Hover makes him happy; click to wave.
 */
export function Juro() {
  // He's drawn in WebGL: only on a graphics card, and once the page has loaded.
  const webgl = useHasWebGL();
  const idle = useIdle();
  return webgl && idle ? <JuroOnPage /> : null;
}

function JuroOnPage() {
  const brain = useRef<JuroBrain>(createBrain());
  const container = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig>({
    g: null,
    out: 0,
    leaving: false,
    vanishFrom: null,
    lastBox: null,
    leftPeek: false,
    arrived: false,
    hold: 0,
    releasing: false,
    lastY: 0,
    standW: new Map(),
    headerBottom: 0,
    compactHeaderBottom: Infinity,
    bubbleSide: "top",
    canvasW: 0,
    resolution: 1,
  });
  const inviteTimer = useRef(0);
  const reduceMotion = useReducedMotion() ?? false;
  const [bubble, setBubble] = useState<string | null>(null);
  const [away, setAway] = useState(false);
  const goneRef = useRef(false);
  const [bubbleSide, setBubbleSide] = useState<"top" | "left">("top");

  useEffect(() => {
    brain.current.reducedMotion = reduceMotion;
    brain.current.say = setBubble;
  }, [reduceMotion]);

  // Layout changes with the window size: measure the header and standing sizes again.
  useEffect(() => {
    const onResize = () => {
      rig.current.headerBottom = 0;
      rig.current.compactHeaderBottom = Infinity;
      rig.current.standW.clear();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cursor, for the eyes.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") brain.current.pointer = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Scroll speed, for leaning with the page.
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      brain.current.scrollVelocity = ((window.scrollY - lastY) / dt) * 1000;
      lastY = window.scrollY;
      lastT = now;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => window.clearTimeout(inviteTimer.current), []);

  // Every frame, from the scroll position: leave the peek for his path, stand on the spot of
  // the section on screen, glide to the next spot as the page scrolls between them (in step
  // with the scroll, so going back up retraces it), and duck out at the footer. Going back up
  // past his first spot, he vanishes and pops up again at the top.
  useAnimationFrame((time, delta) => {
    const el = container.current;
    if (!el) return;
    const b = brain.current;
    const r = rig.current;
    const vh = window.innerHeight;

    const stops = ROUTE.map((name) => ({ name, spot: visibleSpot(name) })).filter(
      (stop): stop is { name: (typeof ROUTE)[number]; spot: HTMLElement } => stop.spot !== null,
    );
    if (!stops.length) return;

    // Standing spots: measure how big he can be while the page is at the top, then keep that
    // size while scrolling. The header is measured by layout (ignoring its entrance animation)
    // and the tallest reading wins, so its expand-back transition doesn't make him breathe.
    const header = document.querySelector<HTMLElement>("header > div");
    if (window.scrollY === 0 && header) r.headerBottom = Math.max(r.headerBottom, header.offsetTop + header.offsetHeight);
    for (const { spot } of stops) {
      if (spot.dataset.juroStand && (window.scrollY === 0 || !r.standW.has(spot))) {
        r.standW.set(spot, standingWidth(spot, r.headerBottom || FALLBACK_HEADER_PX));
      }
    }

    // Where he should be along the route right now.
    const boxes = stops.map(({ spot }) => boxFor(spot, r.standW));
    // The header shrinks (animated) once the page scrolls; below the top, use its final
    // compact size, so his path depends only on the scroll position, not on that animation.
    // (Layout size, so the header's slide-in on page load doesn't count.)
    const liveHeader = header ? header.offsetTop + header.offsetHeight : FALLBACK_HEADER_PX;
    if (window.scrollY > COMPACT_HEADER_AFTER_PX) r.compactHeaderBottom = Math.min(r.compactHeaderBottom, liveHeader);
    const headerEdge =
      window.scrollY > COMPACT_HEADER_AFTER_PX && Number.isFinite(r.compactHeaderBottom) ? r.compactHeaderBottom : liveHeader;
    const top = headerEdge + HEADER_GAP_PX;
    const bottom = vh - BOTTOM_MARGIN_PX;
    const zones = boxes.slice(1).map((next, i) => handoffZone(boxes[i], next, top, bottom, MIN_HANDOFF * vh));
    // Neighbouring glides may not overlap: split any overlap between them.
    for (let i = 1; i < zones.length; i++) {
      if (zones[i][0] < zones[i - 1][1]) {
        const mid = (zones[i][0] + zones[i - 1][1]) / 2;
        zones[i - 1][1] = mid;
        zones[i][0] = mid;
      }
    }
    const sy = window.scrollY;
    let target = 0;
    for (const [i, [start, end]] of zones.entries()) {
      if (sy <= start) break;
      target = i + clamp01((sy - start) / (end - start));
      if (sy < end) break;
    }

    // Follow it: exactly while scrolling smoothly, catching up gently after jumps.
    if (r.g === null || b.reducedMotion) r.g = target;
    else r.g += (target - r.g) * (1 - Math.exp(-FOLLOW_RATE * Math.min(delta, 100) / 1000));
    if (Math.abs(target - r.g) < 1e-4) r.g = target;

    const vw = document.documentElement.clientWidth;
    const first = boxes[0];
    // The scroll position at which his first spot is fully in view.
    const arrivalY = sy + bodyBottom(first) - bottom;

    const peekEnd = peekDistance();
    if (sy >= peekEnd) r.leftPeek = true;
    if (sy >= arrivalY) r.arrived = true;

    const i = Math.min(Math.floor(r.g), boxes.length - 1);
    const t = r.g - i;
    let onPath: Box;
    if (i === 0 && t < 1e-3) {
      // His first spot, or, until it has scrolled into view on the way down, the bottom edge
      // of the screen below it (in the side margin), stepping in to it as it arrives.
      const wait = waitX(first, vw);
      const stepIn = r.arrived ? 1 : smoothstep(clamp01(1 - (arrivalY - sy) / (STEP_IN * vh)));
      onPath = { ...keepInView(first, top, bottom), x: wait + (first.x - wait) * stepIn };
    } else if (t < 1e-3 || i === boxes.length - 1) {
      onPath = boxes[i];
    } else {
      onPath = glide(keepInView(boxes[i], top, bottom), keepInView(boxes[i + 1], top, bottom), smoothstep(t));
    }

    // Opening shot: at the top he peeks up big from the bottom edge. Scrolling (while the hero
    // is pinned) takes him down onto his path; a small scroll back before he gets there undoes it.
    const peek = peekBox(window.innerWidth, vh);
    const departure = Math.min(1, sy / peekEnd);
    let shown = departure < 1 ? depart(peek, onPath, departure) : onPath;

    // Scrolling back up, he doesn't retrace his way to the top: once he's past his first spot
    // (or, before reaching it, back into the hero), he vanishes where he is, and when the hero is
    // back he pops up big from the bottom middle, waving, as on page load. Scrolling down to his
    // spot instead brings him back there.
    const vanish = r.arrived ? sy < arrivalY - EXIT_AFTER * vh : r.leftPeek && sy < peekEnd * (1 - EXIT_AFTER);
    if (!r.leaving && vanish) r.leaving = true;
    else if (r.leaving && sy >= arrivalY) r.leaving = false;
    if (r.leaving && r.out >= 1 && departure < 1) {
      r.leaving = false;
      r.leftPeek = false;
      r.arrived = false;
      r.out = 0;
      r.hold = 1;
      r.releasing = false;
      b.enterId += 1;
    }
    r.out = b.reducedMotion ? (r.leaving ? 1 : 0) : clamp01(r.out + ((r.leaving ? 1 : -1) * Math.min(delta, 100)) / VANISH_MS);
    b.hidden = r.out >= 1;

    // Having popped back up, he stays the full peek until the page scrolls down; then he eases
    // onto his path. (At the very top the path is the peek anyway.)
    if (sy > r.lastY + 0.5 && r.hold > 0) r.releasing = true;
    if (sy <= 0.5) {
      r.hold = 0;
      r.releasing = false;
    } else if (r.releasing) {
      r.hold *= Math.exp((-HOLD_RELEASE_RATE * Math.min(delta, 100)) / 1000);
      if (r.hold < 1e-3) {
        r.hold = 0;
        r.releasing = false;
      }
    }
    r.lastY = sy;
    if (r.hold > 0) shown = mixBox(shown, peek, smoothstep(r.hold));
    if (r.leaving) {
      r.vanishFrom ??= r.lastBox ?? shown;
      shown = poof(r.vanishFrom, r.out);
    } else {
      r.vanishFrom = null;
      r.lastBox = shown;
      if (r.out > 0) shown = poof(shown, r.out);
    }
    el.style.opacity = r.out > 0 ? (1 - smoothstep(r.out)).toFixed(3) : "";

    const current = stops[Math.min(Math.round(r.g), stops.length - 1)];
    const atTop = departure < 1 || r.hold > 0.5;

    // The footer has no free spot: once it fills a good part of the screen (or the page
    // can't scroll further), he waves goodbye and ducks out, riding his last spot away.
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    const footerShown = footer ? Math.min(vh, footer.bottom) - Math.max(0, footer.top) : 0;
    const atEnd = vh + window.scrollY >= document.documentElement.scrollHeight - 4;
    const footerAway = footerShown >= vh * FOOTER_SHARE || atEnd;
    b.away = footerAway;
    const gone = footerAway || r.out >= 1;
    if (gone !== goneRef.current) {
      goneRef.current = gone;
      setAway(gone);
    }

    const mode: JuroMode = footerAway ? "footer" : atTop ? "hero" : current.name;
    if (mode !== b.mode) {
      // Leaving the community section takes its invitation with it (a wave's greeting stays).
      if (b.mode === "community") setBubble((shown) => (shown === INVITE ? null : shown));
      b.mode = mode;
      window.clearTimeout(inviteTimer.current);
      if (mode === "community") {
        setBubble(INVITE);
        inviteTimer.current = window.setTimeout(() => setBubble(null), INVITE_MS);
      } else if (mode === "footer") {
        b.waveRequest = { id: performance.now(), message: "See you soon!" };
      }
    }
    b.focus = centerOf(FOCUS[mode]);

    // His box always has the peek's layout size and is scaled down to his size on screen, so his
    // canvas never has to resize (which flickers); it's drawn at a matching resolution instead.
    if (r.canvasW !== peek.w) {
      r.canvasW = peek.w;
      el.style.width = `${peek.w}px`;
    }
    const resolution = Math.min(1, Math.ceil((shown.w / peek.w) * 16) / 16);
    if (resolution !== r.resolution) {
      r.resolution = resolution;
      b.resolution = resolution;
    }

    // Speech bubble on the side the spot asks for, if there's room for it there on screen.
    const wantsLeft = atTop || current.spot.dataset.juroBubble === "left";
    const side = wantsLeft && shown.x + shown.w * 0.24 > BUBBLE_ROOM_PX ? "left" : "top";
    if (side !== r.bubbleSide) {
      r.bubbleSide = side;
      setBubbleSide(side);
    }

    const scale = shown.w / r.canvasW;
    el.style.transform = `translate3d(${shown.x.toFixed(1)}px, ${shown.y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    el.style.setProperty("--juro-s", scale.toFixed(4));
  });

  return (
    <div
      ref={container}
      className="pointer-events-none fixed top-0 left-0 z-40 aspect-[5/6] w-(--juro-w) origin-top-left will-change-transform"
      style={{ transform: "translate3d(-200vw, 0, 0)" }}
    >
      <JuroCanvas brain={brain} />

      {/* Click target: only his body, not the transparent margin around him. */}
      <button
        type="button"
        aria-label="Juro, the JUKTI mascot. Click to wave hello."
        tabIndex={away ? -1 : undefined}
        aria-hidden={away || undefined}
        onPointerEnter={() => {
          brain.current.hovered = true;
        }}
        onPointerLeave={() => {
          brain.current.hovered = false;
        }}
        onFocus={() => {
          brain.current.hovered = true;
        }}
        onBlur={() => {
          brain.current.hovered = false;
        }}
        onClick={() => {
          brain.current.waveRequest = { id: performance.now(), message: "Hi, I'm Juro!" };
        }}
        className={`absolute inset-x-[24%] top-[20%] bottom-[20%] rounded-[40%] ${away ? "pointer-events-none" : "pointer-events-auto"}`}
      />

      {/* Speech bubble, counter-scaled so the text stays readable when Juro is shrunk to fit. */}
      <AnimatePresence>
        {bubble && (
          <motion.p
            key={bubble}
            role="status"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`glass absolute rounded-2xl px-3.5 py-2 text-sm font-medium whitespace-nowrap text-fg shadow-[0_8px_30px_-10px_rgb(245_124_72/0.6)] [scale:calc(1/var(--juro-s,1))] ${
              bubbleSide === "left"
                ? "top-[20%] right-[76%] origin-top-right rounded-tr-sm"
                : "right-[18%] bottom-[92%] origin-bottom-right rounded-br-sm"
            }`}
          >
            {bubble}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
