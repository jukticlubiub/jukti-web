"use client";

import { useLenis } from "lenis/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MARK_PIECES, MARK_VIEWBOX } from "@/components/brand/logo-paths";
import { banglaFont } from "@/app/fonts";
import { cn } from "@/lib/cn";

/*
 * "How the mark was made": the JUKTI mark's origin in the word যুক্তি ("logic"), told in
 * five steps. The text scrolls past a sticky stage that animates to each step; the step
 * buttons jump between them, and hovering (or tapping) a part traces it through every
 * step. Follows the club's own construction sheet for the mark.
 */

const bangla = banglaFont;

type PartId = "A" | "B" | "C" | "D" | "E" | "F";

/** Each part of the mark and the feature of the word it comes from (`bn` is the letter, if any). */
const parts: { id: PartId; name: string; source: string; bn?: string }[] = [
  { id: "A", name: "Upper curve", source: "the arch over", bn: "ক্তি" },
  { id: "B", name: "Left triangle", source: "the body of", bn: "য" },
  { id: "C", name: "Central axis", source: "the stem joining the letters" },
  { id: "D", name: "Circle", source: "the loop of", bn: "ক্ত" },
  { id: "E", name: "Right triangle", source: "the body of", bn: "ক্ত" },
  { id: "F", name: "Lower curve", source: "the hook under", bn: "যু" },
];

const steps = [
  {
    title: "One word",
    body: "The mark began as the word যুক্তি, “logic”, written by hand. Six of its features carry into the mark. Hover the letters A to F to find them.",
  },
  {
    title: "Taken apart",
    body: "Each feature was lifted out of the word on its own: two curves, two triangular letter bodies, the loop of the conjunct, and the stem that holds the letters together.",
  },
  {
    title: "Reduced to geometry",
    body: "The hand-drawn pieces were simplified into pure forms (arcs, triangles, a circle and a straight axis) and set on a grid, one of each. This is the master template.",
  },
  {
    title: "Mirrored and balanced",
    body: "The template was mirrored around the central axis, which became the gap between the two halves. Equal heights (h) and fixed spacing (2m and 3m) keep every part in balance.",
  },
  {
    title: "The mark",
    body: "Fused together, the geometry became the JUKTI mark: logic you can read in the word, and see in the shape.",
  },
];

// ---------------------------------------------------------------------------
// Geometry. The mark's own units (its viewBox), placed in the middle of a 600 × 600 stage.
// ---------------------------------------------------------------------------

const [, , MARK_W, MARK_H] = MARK_VIEWBOX.split(" ").map(Number);
const O = { x: 300 - MARK_W / 2, y: 300 - MARK_H / 2 };
const at = (x: number, y: number) => ({ x: O.x + x, y: O.y + y });

/** The construction shapes, each drawn around its own centre. */
const shapes: Record<PartId, React.ReactNode> = {
  A: <path d="M-59 15 Q 0 -30 59 15" strokeWidth="13" fill="none" strokeLinecap="round" />,
  B: <path d="M-83 0 L83 -78 L83 78 Z" />,
  C: <rect x="-6" y="-178" width="12" height="356" rx="3" />,
  D: <circle r="33" />,
  E: <path d="M-83 -78 L83 0 L-83 78 Z" />,
  F: <path d="M-58 -10 Q 0 34 58 -10" strokeWidth="13" fill="none" strokeLinecap="round" />,
};

/** Where each part sits in the finished mark (mark units). */
const home: Record<PartId, { x: number; y: number }> = {
  A: { x: 277, y: 18 },
  B: { x: 83, y: 128 },
  C: { x: 190.5, y: 228.5 },
  D: { x: 119.5, y: 233 },
  E: { x: 298, y: 128 },
  F: { x: 110, y: 438 },
};

/** Where each part comes from in the word (stage units), for step 1. */
const inWord: Record<PartId, { x: number; y: number }> = {
  A: { x: 352, y: 194 },
  B: { x: 170, y: 290 },
  C: { x: 300, y: 256 },
  D: { x: 377, y: 294 },
  E: { x: 428, y: 320 },
  F: { x: 205, y: 374 },
};

/** Laid out in two rows for step 2 (stage units). */
const apart: Record<PartId, { x: number; y: number }> = {
  A: { x: 130, y: 300 },
  B: { x: 300, y: 300 },
  C: { x: 470, y: 330 },
  D: { x: 130, y: 470 },
  E: { x: 300, y: 470 },
  F: { x: 470, y: 452 },
};

/** The copies made in step 4: which part each copies, and where it goes (mark units). */
const mirrors: { of: PartId; to: { x: number; y: number } }[] = [
  { of: "B", to: { x: 83, y: 329.5 } },
  { of: "E", to: { x: 298, y: 329.5 } },
  { of: "D", to: { x: 265, y: 233 } },
];

type Pose = { x: number; y: number; scale: number; opacity: number; rotate?: number };

function pose(id: PartId, step: number): Pose {
  if (step === 0) return { ...inWord[id], scale: 0.25, opacity: 0 };
  if (step === 1) return { ...apart[id], scale: id === "C" ? 0.42 : 0.62, opacity: 1, rotate: id === "C" ? 90 : 0 };
  const p = at(home[id].x, home[id].y);
  if (id === "C") return { ...p, scale: 1, opacity: step === 2 ? 1 : 0 };
  return { ...p, scale: 1, opacity: step >= 4 ? 0 : 1 };
}

const spring = { type: "spring", stiffness: 120, damping: 18, mass: 0.9 } as const;

function Stage({ step, focus, setFocus }: { step: number; focus: PartId | null; setFocus: (id: PartId | null) => void }) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : spring;
  const guide = "#9a918b";

  const partStyle = (id: PartId) =>
    cn(
      "transition-[fill,stroke,opacity] duration-300",
      focus === id
        ? "fill-flare/45 stroke-flare"
        : focus
          ? "fill-white/[0.04] stroke-white/25"
          : "fill-white/[0.08] stroke-white/75",
    );

  return (
    <svg viewBox="0 0 600 600" className="size-full overflow-visible" role="img" aria-label={`Step ${step + 1} of 5: ${steps[step].title}`}>
      <defs>
        <filter id="logo-story-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid, from the geometry steps on */}
      <motion.g initial={false} animate={{ opacity: step >= 2 && step <= 3 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={60 + i * 40} y1="40" x2={60 + i * 40} y2="560" stroke="#ffffff" strokeOpacity={i === 6 ? 0 : 0.06} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} x1="60" y1={40 + i * 40} x2="540" y2={40 + i * 40} stroke="#ffffff" strokeOpacity="0.06" />
        ))}
      </motion.g>

      {/* The word */}
      <motion.text
        x="300"
        y="300"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="190"
        className={cn(bangla.className, "fill-white")}
        initial={false}
        animate={{ opacity: step === 0 ? 1 : step === 1 ? 0.22 : 0, y: step === 0 ? 0 : -130, scale: step === 0 ? 1 : 0.55 }}
        transition={transition}
        style={{ transformOrigin: "300px 300px" }}
      >
        যুক্তি
      </motion.text>

      {/* Step 1: where each part hides in the word */}
      {parts.map((p, i) => (
        <motion.g
          key={`spot-${p.id}`}
          initial={false}
          animate={{ opacity: step === 0 ? 1 : 0, scale: step === 0 ? 1 : 0.4 }}
          transition={{ ...transition, delay: step === 0 && !reduceMotion ? 0.25 + i * 0.07 : 0 }}
          style={{ x: inWord[p.id].x, y: inWord[p.id].y, pointerEvents: step === 0 ? "auto" : "none" }}
          onPointerEnter={() => setFocus(p.id)}
          onPointerLeave={() => setFocus(null)}
          onClick={() => setFocus(focus === p.id ? null : p.id)}
          className="cursor-pointer"
        >
          <circle r="20" className={cn("transition-[fill,stroke] duration-300", focus === p.id ? "fill-lava stroke-white" : "fill-black/85 stroke-flare")} strokeWidth="2" />
          {!reduceMotion && focus !== p.id && (
            <circle r="20" className="fill-none stroke-flare/60" strokeWidth="1.5">
              <animate attributeName="r" values="20;34" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          )}
          <text textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="600" className="pointer-events-none fill-white">
            {p.id}
          </text>
        </motion.g>
      ))}

      {/* The parts, from the word to the mark */}
      {parts.map((p, i) => {
        const to = pose(p.id, step);
        return (
          <motion.g
            key={p.id}
            initial={false}
            animate={{ x: to.x, y: to.y, scale: to.scale, opacity: to.opacity, rotate: to.rotate ?? 0 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : i * 0.05 }}
            onPointerEnter={() => setFocus(p.id)}
            onPointerLeave={() => setFocus(null)}
            style={{ pointerEvents: to.opacity > 0 ? "auto" : "none" }}
          >
            <g className={partStyle(p.id)} strokeWidth={p.id === "A" || p.id === "F" ? 13 : 2} strokeLinejoin="round">
              {shapes[p.id]}
            </g>
            {/* Part letters while they're laid out (C's is drawn upright below) */}
            {p.id !== "C" && (
              <motion.text
                initial={false}
                animate={{ opacity: step === 1 ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                dy={p.id === "A" ? -48 : p.id === "F" ? 52 : 0}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="30"
                fontWeight="600"
                className="pointer-events-none fill-flare"
              >
                {p.id}
              </motion.text>
            )}
          </motion.g>
        );
      })}
      {/* C's letter, upright beside its (rotated) bar */}
      <motion.text
        x={apart.C.x}
        y={apart.C.y - 30}
        textAnchor="middle"
        fontSize="30"
        fontWeight="600"
        className="fill-flare"
        initial={false}
        animate={{ opacity: step === 1 ? 1 : 0 }}
      >
        C
      </motion.text>

      {/* Step 4: the mirrored copies slide out of their originals */}
      {mirrors.map((m, i) => {
        const from = at(home[m.of].x, home[m.of].y);
        const to = at(m.to.x, m.to.y);
        const shown = step === 3;
        return (
          <motion.g
            key={`mirror-${m.of}`}
            initial={false}
            animate={{ x: shown || step === 4 ? to.x : from.x, y: shown || step === 4 ? to.y : from.y, opacity: shown ? 1 : 0 }}
            transition={{ ...transition, delay: shown && !reduceMotion ? 0.15 + i * 0.12 : 0 }}
            onPointerEnter={() => setFocus(m.of)}
            onPointerLeave={() => setFocus(null)}
          >
            <g className={partStyle(m.of)} strokeWidth="2" strokeLinejoin="round" strokeDasharray={shown ? undefined : "6 6"}>
              {shapes[m.of]}
            </g>
          </motion.g>
        );
      })}

      {/* Step 4: the symmetry axis and the spacing guides */}
      <motion.g initial={false} animate={{ opacity: step === 3 ? 1 : 0 }} transition={{ duration: 0.5, delay: step === 3 ? 0.5 : 0 }} fontSize="19" fill={guide}>
        <line x1={O.x + 190.5} y1="20" x2={O.x + 190.5} y2="580" stroke="#f57c48" strokeDasharray="7 7" strokeWidth="1.5" />
        {/* h, 2m, h on the right */}
        <g stroke={guide} strokeWidth="1">
          {[
            [50, 206, "h"],
            [206, 252, "2m"],
            [252, 407, "h"],
          ].map(([y1, y2, label]) => (
            <g key={`${y1}`}>
              <line x1={O.x + 405} y1={O.y + (y1 as number)} x2={O.x + 405} y2={O.y + (y2 as number)} />
              <line x1={O.x + 399} y1={O.y + (y1 as number)} x2={O.x + 411} y2={O.y + (y1 as number)} />
              <line x1={O.x + 399} y1={O.y + (y2 as number)} x2={O.x + 411} y2={O.y + (y2 as number)} />
              <text x={O.x + 418} y={O.y + ((y1 as number) + (y2 as number)) / 2} dominantBaseline="middle" stroke="none">
                {label}
              </text>
            </g>
          ))}
          {/* 3m: the gap between the halves */}
          <line x1={O.x + 166} y1={O.y + 478} x2={O.x + 215} y2={O.y + 478} />
          <line x1={O.x + 166} y1={O.y + 472} x2={O.x + 166} y2={O.y + 484} />
          <line x1={O.x + 215} y1={O.y + 472} x2={O.x + 215} y2={O.y + 484} />
          <text x={O.x + 190.5} y={O.y + 500} textAnchor="middle" stroke="none">
            3m
          </text>
        </g>
      </motion.g>

      {/* Step 5: the finished mark */}
      <motion.g
        initial={false}
        animate={{ opacity: step === 4 ? 1 : 0, scale: step === 4 ? 1 : 0.92 }}
        transition={{ ...transition, delay: step === 4 && !reduceMotion ? 0.2 : 0 }}
        style={{ transformOrigin: "300px 300px" }}
        filter="url(#logo-story-glow)"
      >
        <g transform={`translate(${O.x} ${O.y})`}>
          {Object.values(MARK_PIECES).map((d) => (
            <path key={d} d={d} fill="#f58839" />
          ))}
        </g>
      </motion.g>
    </svg>
  );
}

export function LogoStory() {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<PartId | null>(null);
  const [besideStage, setBesideStage] = useState(true);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const lenis = useLenis();

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setBesideStage(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const goTo = (i: number) => {
    const el = stepRefs.current[i];
    if (!el) return;
    setStep(i);
    const offset = -window.innerHeight * 0.35;
    if (lenis) lenis.scrollTo(el, { offset });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="mark-story-title" className="relative z-10 mx-auto max-w-[84rem] px-5 pt-[clamp(6rem,14vh,10rem)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[0.95rem] text-flare">
          <span className={bangla.className}>যুক্তি</span> → the mark
          <span aria-hidden className="inline-block -rotate-45">→</span>
        </p>
        <h2 id="mark-story-title" className="mt-4 text-[clamp(2.2rem,4.4vw,4.2rem)] leading-[1.02] font-extralight tracking-[-0.04em] text-fg">
          How the mark was made
        </h2>
        <p className="mt-5 max-w-2xl text-[clamp(1.02rem,1.2vw,1.18rem)] leading-relaxed text-body/85">
          Our logo isn’t just a shape. It’s our name, taken apart letter by letter and rebuilt in geometry. Scroll through the
          five steps, or hover any part to follow it from the word to the mark.
        </p>
      </div>

      <div className="mt-[clamp(2.5rem,5vw,4.5rem)] grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-[clamp(3rem,6vw,7rem)]">
        {/* The stage: sticky beside (or, on phones, above) the steps. On phones its black panel
            stops at the page's right padding, leaving the About line's lane (the right edge) clear. */}
        <div className="sticky top-[4.75rem] z-10 max-md:-ml-5 max-md:bg-black max-md:pb-4 max-md:pl-5 max-md:shadow-[0_28px_24px_-6px_#000] md:order-2 md:top-[max(6rem,calc(50svh-min(34rem,100svh-11rem)/2-1.5rem))] md:self-start">
          <div className="glass-card relative mx-auto aspect-square w-[min(100%,46svh)] overflow-hidden bg-black/60 md:w-[min(100%,34rem,100svh-11rem)]">
            <div aria-hidden className="absolute inset-[18%] rounded-full bg-[radial-gradient(closest-side,rgb(245_124_72/0.18),transparent)]" />
            <div className="absolute inset-[6%]">
              <Stage step={step} focus={focus} setFocus={setFocus} />
            </div>
            <p className="absolute top-4 left-5 text-[0.75rem] tracking-[0.16em] text-muted uppercase">
              Step {step + 1} / {steps.length}
            </p>
          </div>

          {/* Step buttons */}
          <div role="group" aria-label="Steps" className="mx-auto mt-4 flex w-[min(100%,46svh)] justify-center gap-2 md:w-[min(100%,34rem,100svh-11rem)]">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={step === i ? "step" : undefined}
                onClick={() => goTo(i)}
                className={cn(
                  "h-9 min-w-9 rounded-full border px-3 font-display text-[0.75rem] transition-[background-color,border-color,color] duration-300",
                  step === i ? "border-flare bg-lava text-white" : "border-glass-border bg-black/50 text-muted hover:border-flare/50 hover:text-fg",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        {/* The steps */}
        <ol className="relative">
          {steps.map((s, i) => (
            <Step key={`${s.title}-${besideStage}`} index={i} active={step === i} band={besideStage ? "-45% 0px -45% 0px" : "-64% 0px -24% 0px"} onActive={() => setStep(i)} ref={(el) => {
              stepRefs.current[i] = el;
            }}>
              <p className={cn("text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.85] font-extralight tracking-[-0.06em] transition-colors duration-500", step === i ? "text-fg" : "text-white/25")}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className={cn("mt-4 text-[clamp(1.35rem,2vw,1.9rem)] font-normal tracking-[-0.02em] transition-colors duration-500", step === i ? "text-fg" : "text-white/40")}>
                {s.title}
              </h3>
              <p className={cn("mt-4 max-w-md text-[clamp(1rem,1.1vw,1.1rem)] leading-[1.75] transition-colors duration-500", step === i ? "text-body/90" : "text-body/35")}>
                {i === 0 ? (
                  <>
                    The mark began as the word <span className={bangla.className}>যুক্তি</span>, “logic”, written by hand. Six of its
                    features carry into the mark. Hover the letters A to F to find them.
                  </>
                ) : (
                  s.body
                )}
              </p>

              {/* The parts, as a key you can hover */}
              {i === 0 && (
                <ul className="mt-6 grid max-w-md gap-2 sm:grid-cols-2">
                  {parts.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onPointerEnter={() => setFocus(p.id)}
                        onPointerLeave={() => setFocus(null)}
                        onFocus={() => setFocus(p.id)}
                        onBlur={() => setFocus(null)}
                        onClick={() => setFocus(focus === p.id ? null : p.id)}
                        aria-pressed={focus === p.id}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-[14px] border px-3.5 py-2.5 text-left transition-[background-color,border-color] duration-200",
                          focus === p.id ? "border-flare/60 bg-lava/15" : "border-glass-border bg-white/[0.03] hover:border-flare/40",
                        )}
                      >
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-flare/15 text-[0.8rem] font-semibold text-flare">{p.id}</span>
                        <span className="leading-snug">
                          <span className="block text-[0.95rem] text-fg">{p.name}</span>
                          <span className="block text-[0.82rem] text-muted">
                            from {p.source}
                            {p.bn && <span className={cn(bangla.className, "ml-1 text-body")}>{p.bn}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Step>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** One step's text. It becomes the active step when it reaches the middle of the screen. */
function Step({
  index,
  active,
  band,
  onActive,
  ref,
  children,
}: {
  index: number;
  active: boolean;
  /** The strip of the screen (as an IntersectionObserver margin) where a step becomes active. */
  band: `${number}% 0px ${number}% 0px`;
  onActive: () => void;
  ref: (el: HTMLLIElement | null) => void;
  children: React.ReactNode;
}) {
  const own = useRef<HTMLLIElement>(null);
  const inMiddle = useInView(own, { margin: band });

  useEffect(() => {
    if (inMiddle) onActive();
  }, [inMiddle, onActive]);

  return (
    <li
      ref={(el) => {
        own.current = el;
        ref(el);
      }}
      aria-current={active ? "step" : undefined}
      className={cn("flex min-h-[72svh] flex-col justify-center py-10 md:min-h-[85svh]", index === 0 && "md:min-h-[70svh]")}
    >
      {children}
    </li>
  );
}
