"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ArrowIcon } from "@/components/ui/icons";
import { useHasWebGL } from "@/components/ui/useHasWebGL";
import { useIdle } from "@/components/ui/useIdle";
import { Reveal } from "@/components/ui/Reveal";
import type { StoryChapter as Chapter } from "@/lib/data/story";
import { joinLink } from "@/lib/site";
import { LogoStory } from "./LogoStory";
import { StoryChapter } from "./StoryChapter";
import { WhoWeAre } from "./WhoWeAre";

const JuktiMark3D = dynamic(() => import("./JuktiMark3D"), { ssr: false });

/*
 * The About page as a story map. One glowing line runs from the hero down through every
 * chapter to the end. It's drawn as you scroll, with a ball riding its tip at the reading
 * line; when the ball reaches a chapter's dot, the dot lights up and the chapter's
 * picture fills with colour (and stays coloured).
 *
 * The line's route is measured from the page: it waves across the hero behind the 3D
 * mark, runs down the right margin past "who we are" and the story of the mark, then through each
 * chapter's dot, down the gutter beside its text, and sweeps across the gap to the next.
 */

/** Where the ball rides on screen, as a share of the window height. */
const READING_LINE = 0.58;
/** Extra strands drawn beside the main line (offset in px, opacity), as in the reference. */
const STRANDS: [number, number, number][] = [
  [5, 7, 0.32],
  [10, 14, 0.18],
  [-5, -7, 0.14],
];

/** The glowing, drawn part of the line: wide faint glow, glow, bright core. */
const GLOW_LAYERS = [
  { w: 16, o: 0.05, c: "#f57c48" },
  { w: 8, o: 0.14, c: "#f57c48" },
  { w: 2.4, o: 1, c: "#fff3ea" },
];
/** Below this width (phones) only the glow and core are drawn, without the wide glow or the strands. */
const COMPACT_BELOW = 768;

type Pt = { x: number; y: number };
/** A point the line passes through, heading in direction `d` (a unit vector). */
type Waypoint = Pt & { d: Pt };
type Sample = { len: number; x: number; y: number };

/** One curve of the line: drawn on its own, so scrolling only repaints the piece the ball is on. */
type Segment = { d: string; start: number; len: number };

type Route = {
  width: number;
  height: number;
  d: string;
  segments: Segment[];
  total: number;
  samples: Sample[];
  /** Scroll position → length along the line, as matching pairs (increasing). */
  keys: { scroll: number; len: number }[];
  /** Length along the line at each chapter's dot, then at the end dot. */
  nodeLens: number[];
};

const unit = (x: number, y: number): Pt => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

function bezier(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
}

/** A smooth path through the waypoints, leaving and entering each along its direction. */
function buildPath(points: Waypoint[]) {
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const samples: Sample[] = [{ len: 0, x: points[0].x, y: points[0].y }];
  const lens = [0];
  const segments: Segment[] = [];
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const reach = Math.hypot(p1.x - p0.x, p1.y - p0.y) * 0.42;
    const c1 = { x: p0.x + p0.d.x * reach, y: p0.y + p0.d.y * reach };
    const c2 = { x: p1.x - p1.d.x * reach, y: p1.y - p1.d.y * reach };
    const curve = ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    d += curve;
    const start = len;
    let prev: Pt = p0;
    for (let k = 1; k <= 48; k++) {
      const p = bezier(p0, c1, c2, p1, k / 48);
      len += Math.hypot(p.x - prev.x, p.y - prev.y);
      samples.push({ len, x: p.x, y: p.y });
      prev = p;
    }
    lens.push(len);
    segments.push({ d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)}${curve}`, start, len: len - start });
  }
  return { d, segments, samples, total: len, lens };
}

function pointAt(samples: Sample[], len: number): Pt {
  let lo = 0;
  let hi = samples.length - 1;
  if (len <= 0) return samples[0];
  if (len >= samples[hi].len) return samples[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].len < len) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const t = (len - a.len) / (b.len - a.len || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lengthForScroll(keys: Route["keys"], scroll: number) {
  if (scroll <= keys[0].scroll) return keys[0].len;
  for (let i = 1; i < keys.length; i++) {
    if (scroll <= keys[i].scroll) {
      const a = keys[i - 1];
      const b = keys[i];
      return a.len + ((scroll - a.scroll) / (b.scroll - a.scroll)) * (b.len - a.len);
    }
  }
  return keys[keys.length - 1].len;
}

export function StoryMap({ chapters }: { chapters: Chapter[] }) {
  const reduceMotion = useReducedMotion() ?? false;
  const container = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const endNode = useRef<HTMLSpanElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  /** Drawn paths, per segment (one per glow layer and strand). */
  const drawn = useRef<SVGPathElement[][]>([]);
  /** How much of each segment was showing last time (0..1), so unchanged ones aren't touched. */
  const shown = useRef<number[]>([]);
  const ball = useRef<HTMLDivElement>(null);
  const routeRef = useRef<Route | null>(null);

  const [route, setRoute] = useState<Route | null>(null);
  /** Chapters whose picture has turned to colour (it stays). */
  const [reached, setReached] = useState(0);
  /** Dots the ball has passed right now (including the end dot). */
  const [passed, setPassed] = useState(0);

  const { scrollY } = useScroll();

  // The 3D mark: only on a graphics card, once the page is idle. Until it's drawn (or
  // where it can't run), the flat mark stands in.
  const webgl = useHasWebGL();
  const idle = useIdle();
  const [markReady, setMarkReady] = useState(false);

  const draw = useCallback((scroll: number) => {
    const r = routeRef.current;
    if (!r) return;
    const len = Math.min(r.total, lengthForScroll(r.keys, scroll));
    // Each segment is drawn on its own (pathLength 1): only the one the ball is on changes,
    // so a scroll repaints a short piece of line instead of the whole page-tall path.
    r.segments.forEach((seg, i) => {
      const part = seg.len > 0 ? Math.min(1, Math.max(0, (len - seg.start) / seg.len)) : 1;
      if (shown.current[i] === part) return;
      shown.current[i] = part;
      // Unmounted layers leave null refs (the phone layout draws fewer).
      for (const path of drawn.current[i] ?? []) if (path) path.style.strokeDashoffset = String(1 - part);
    });
    const p = pointAt(r.samples, len);
    if (ball.current) {
      ball.current.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      ball.current.style.opacity = len > 1 ? "1" : "0";
    }
    const count = r.nodeLens.filter((l) => len >= l - 2).length;
    setPassed(count);
    setReached((n) => Math.max(n, count));
  }, []);

  // Measure the page and lay the line out through it.
  const layout = useCallback(() => {
    const box = container.current;
    const heroBox = hero.current;
    if (!box || !heroBox) return;
    const c = box.getBoundingClientRect();
    const W = c.width;
    const rel = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    };
    const center = (el: Element) => {
      const r = rel(el);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    };

    const h = rel(heroBox);
    const m = mark.current ? center(mark.current) : { x: W / 2, y: h.y + h.h * 0.66 };
    const points: Waypoint[] = [
      { x: -W * 0.04, y: m.y - h.h * 0.08, d: unit(1, 0.55) },
      { x: W * 0.2, y: m.y + h.h * 0.14, d: unit(1, 0) },
      { x: m.x, y: m.y, d: unit(1, -0.75) },
      { x: W * 0.8, y: m.y - h.h * 0.16, d: unit(1, 0) },
    ];
    const heroPoints = points.length;
    // Down the right margin, clear of the story of the mark.
    if (logo.current) {
      const l = rel(logo.current);
      const edge = W - Math.min(40, Math.max(10, W * 0.022));
      points.push({ x: edge, y: l.y + 40, d: { x: 0, y: 1 } }, { x: edge, y: l.y + l.h, d: { x: 0, y: 1 } });
    }
    const nodeIndexes: number[] = [];

    chapters.forEach((_, i) => {
      const node = nodes.current[i];
      const row = rows.current[i];
      if (!node || !row) return;
      const p = center(node);
      const r = rel(row);
      nodeIndexes.push(points.length);
      points.push({ ...p, d: { x: 0, y: 1 } });
      // Straight down beside the text to the bottom of the chapter, then across to the next.
      points.push({ x: p.x, y: Math.max(p.y + 40, r.y + r.h), d: { x: 0, y: 1 } });
    });
    if (endNode.current) {
      nodeIndexes.push(points.length);
      points.push({ ...center(endNode.current), d: { x: 0, y: 1 } });
    }
    if (points.length < heroPoints + 1) return;

    const { d, segments, samples, total, lens } = buildPath(points);
    const top = c.top + window.scrollY;
    const reading = window.innerHeight * READING_LINE;
    // The ball starts at the hero's left edge, then reaches each point after the hero
    // just as that point scrolls up to the reading line.
    const keys = [{ scroll: 0, len: 0 }];
    for (let i = heroPoints; i < points.length; i++) {
      const scroll = top + points[i].y - reading;
      if (scroll > keys[keys.length - 1].scroll + 1) keys.push({ scroll, len: lens[i] });
    }
    const next: Route = { width: W, height: c.height, d, segments, total, samples, keys, nodeLens: nodeIndexes.map((i) => lens[i]) };
    shown.current = [];
    routeRef.current = next;
    setRoute(next);
  }, [chapters]);

  useEffect(() => {
    layout();
    const box = container.current;
    if (!box) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(box);
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", layout);
    };
  }, [layout]);

  // Redraw once the new route's paths are in the DOM.
  useEffect(() => {
    draw(window.scrollY);
  }, [route, draw]);

  useMotionValueEvent(scrollY, "change", draw);

  // Each drawn piece has pathLength 1: dash 1, gap 1, starting fully hidden.
  const dash = { strokeDasharray: "1 1", strokeDashoffset: 1 };

  return (
    <div ref={container} className="relative">
      {/* The line: a faint track for the road ahead, and the glowing part already travelled. */}
      {route && (
        <svg
          aria-hidden
          width={route.width}
          height={route.height}
          viewBox={`0 0 ${route.width} ${route.height}`}
          className="pointer-events-none absolute top-0 left-0 z-0 overflow-visible"
          fill="none"
          strokeLinecap="round"
        >
          <path d={route.d} stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1.5" />
          {STRANDS.map(([dx, dy, o]) => (
            <path key={`t${dx}`} d={route.d} transform={`translate(${dx} ${dy})`} stroke="#ffffff" strokeOpacity={o * 0.25} strokeWidth="1" />
          ))}
          {/* The drawn part, one piece per curve (see draw). Butt caps so the pieces meet seamlessly. */}
          {route.segments.map((seg, si) => {
            const compact = route.width < COMPACT_BELOW;
            const layers = [
              ...(compact ? GLOW_LAYERS.slice(1) : GLOW_LAYERS).map((g) => ({ ...g, dx: 0, dy: 0 })),
              ...(compact ? [] : STRANDS.map(([dx, dy, o]) => ({ w: 1, o, c: "#ffffff", dx, dy }))),
            ];
            return (
              <g key={si} strokeLinecap="butt">
                {layers.map((l, li) => (
                  <path
                    key={li}
                    ref={(el) => {
                      (drawn.current[si] ??= [])[li] = el as SVGPathElement;
                    }}
                    d={seg.d}
                    pathLength={1}
                    transform={l.dx || l.dy ? `translate(${l.dx} ${l.dy})` : undefined}
                    stroke={l.c}
                    strokeOpacity={l.o}
                    strokeWidth={l.w}
                    style={dash}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      )}
      {/* The ball riding the tip of the line. */}
      <div
        ref={ball}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 z-20 size-[22px] rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          background: "radial-gradient(circle at 35% 30%, #ffffff, #ffe2d1 45%, #f57c48 100%)",
          boxShadow: "0 0 0 6px rgb(245 124 72 / 0.12), 0 0 30px 6px rgb(245 124 72 / 0.55)",
        }}
      />

      {/* Hero */}
      <section ref={hero} aria-labelledby="about-title" className="relative z-10 min-h-[max(48rem,120svh)] px-5 pt-[clamp(8.5rem,13vw,13rem)] text-center">
        <h1 id="about-title" className="inline-flex items-center gap-3 text-[clamp(1.05rem,1.5vw,1.45rem)] font-light tracking-[0.01em] text-fg">
          About Us
          <ArrowIcon className="-rotate-45 text-flare" />
        </h1>
        <Reveal immediate delay={0.1}>
          <p className="mt-3 text-[clamp(6.5rem,17vw,15rem)] leading-[0.9] font-extralight tracking-[-0.07em] text-fg">2014</p>
        </Reveal>
        <Reveal immediate delay={0.25} className="mx-auto mt-5 max-w-xl text-[clamp(1.02rem,1.25vw,1.2rem)] leading-relaxed text-body/85">
          The year a trip to Kuakata became the Club of CSE at IUB. Follow the line: each memory fills with colour as you
          reach it, or wherever you hover.
        </Reveal>

        <div ref={mark} className="relative mx-auto mt-[clamp(1rem,3vw,3rem)] h-[clamp(19rem,34vw,30rem)] w-[min(100%,clamp(19rem,34vw,30rem))]">
          <div aria-hidden className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(245_124_72/0.35),transparent)] blur-2xl" />
          <LogoMark
            title=""
            className={`absolute inset-0 m-auto w-[46%] text-flare transition-opacity duration-500 ${markReady ? "opacity-0" : "opacity-100"}`}
          />
          {webgl && idle && <JuktiMark3D reduceMotion={reduceMotion} onReady={() => setMarkReady(true)} />}
        </div>
        <p className="mt-2 text-[0.82rem] tracking-[0.14em] text-muted uppercase">
          <span className="max-md:hidden">Drag to spin · hover to open · click to scatter</span>
          <span className="md:hidden">Swipe to spin · tap to scatter</span>
        </p>
      </section>

      <div ref={logo}>
        <WhoWeAre />
        <LogoStory />
      </div>

      {/* Chapters */}
      <ol className="relative z-10 mx-auto grid max-w-[84rem] gap-[clamp(10rem,24vh,16rem)] px-5 pt-[clamp(8rem,18vh,13rem)] lg:px-[clamp(2rem,4vw,5rem)]">
        {chapters.map((chapter, i) => (
          <StoryChapter
            key={chapter.id}
            chapter={chapter}
            index={i}
            colored={i < reached}
            lit={i < passed}
            textSide={i % 2 === 0 ? "right" : "left"}
            nodeRef={(el) => {
              nodes.current[i] = el;
            }}
            rowRef={(el) => {
              rows.current[i] = el;
            }}
          />
        ))}
      </ol>

      {/* The end of the line: the next chapter. */}
      <section aria-labelledby="next-chapter-title" className="relative z-10 px-5 pt-[clamp(10rem,24vh,16rem)] pb-[clamp(6rem,12vw,12rem)] text-center">
        <span
          ref={endNode}
          aria-hidden
          className={`mx-auto block size-5 rounded-full border transition-[background-color,border-color,box-shadow] duration-500 ${
            passed > chapters.length
              ? "border-flare bg-flare shadow-[0_0_0_8px_rgb(245_124_72/0.15),0_0_34px_rgb(245_124_72/0.9)]"
              : "border-white/35 bg-black"
          }`}
        />
        <p className={`mt-8 flex items-center justify-center gap-2 text-[0.95rem] ${passed > chapters.length ? "text-flare" : "text-muted"}`}>
          Next <span aria-hidden className="inline-block -rotate-45">→</span>
        </p>
        <p aria-hidden className="mt-3 text-[clamp(4.5rem,10vw,9rem)] leading-[0.85] font-extralight tracking-[-0.06em] text-fg">
          {String(chapters.length + 1).padStart(2, "0")}
        </p>
        <h2 id="next-chapter-title" className="mt-6 text-[clamp(1.6rem,3vw,2.8rem)] leading-[1.1] font-normal tracking-[-0.02em] text-fg">
          The next chapter is yours
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[clamp(1.02rem,1.2vw,1.18rem)] leading-relaxed text-body/85">
          Every member adds a line to this story. Join JUKTI and help write what comes next.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href={joinLink.href}
            className="inline-flex items-center gap-3 rounded-full border border-flare/50 px-6 py-3 text-[0.95rem] text-flare transition-[background-color,color,border-color] duration-300 hover:border-flare hover:bg-lava hover:text-white"
          >
            <ArrowIcon />
            {joinLink.label}
          </Link>
          <Link href="/team" className="btn-pill btn-ghost text-[0.85rem]">
            Meet the team
          </Link>
        </div>
      </section>
    </div>
  );
}
