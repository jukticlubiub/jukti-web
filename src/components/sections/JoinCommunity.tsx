"use client";

import { useAnimationFrame, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { JuroSpot } from "@/components/juro/JuroSpot";
import { Silhouette } from "@/components/team/Silhouette";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { PillButton } from "@/components/ui/PillButton";
import { cn } from "@/lib/cn";
import type { TeamMember } from "@/lib/data/team";
import { joinLink } from "@/lib/site";

/*
 * "Join Our Community": concentric orbits with glowing balls travelling along them,
 * member chips resting on the rings (they take turns opening to show a name and
 * role), and the call to action in the middle. Drawn in one SVG coordinate space;
 * the chips are HTML placed at the same coordinates as percentages.
 */

const VIEW_W = 1000;
const VIEW_H = 700; // the rings have faded out by the bottom edge
const CX = 500;
const CY = 450;
const RINGS = [230, 318, 405] as const; // inner, middle, outer

/** Where each chip rests: which ring, and the angle in degrees (0 = right, negative = above). */
const CHIP_SPOTS: { ring: number; angle: number }[] = [
  { ring: 2, angle: -104 },
  { ring: 1, angle: -63 },
  { ring: 1, angle: -141 },
  { ring: 0, angle: -38 },
  { ring: 1, angle: -12 },
  { ring: 2, angle: -176 },
  { ring: 0, angle: 166 },
  { ring: 0, angle: 25 },
];

/** Glowing balls: ring, starting angle, and speed in degrees per second (negative runs anticlockwise). */
const BALLS: { ring: number; start: number; speed: number; size: number }[] = [
  { ring: 0, start: -150, speed: 16, size: 1 },
  { ring: 0, start: 10, speed: 16, size: 0.8 },
  { ring: 0, start: -70, speed: -11, size: 0.7 },
  { ring: 1, start: -40, speed: 10, size: 1 },
  { ring: 1, start: -190, speed: -8, size: 0.85 },
  { ring: 2, start: -120, speed: 6.5, size: 1.1 },
  { ring: 2, start: -20, speed: 6.5, size: 0.8 },
  { ring: 2, start: 175, speed: -5, size: 0.9 },
];

/** How many chips are open at once, and how often one closes while another opens. */
const OPEN_AT_ONCE = 3;
const CYCLE_MS = 2200;

/** The rings fade out toward the bottom (the SVG's orbit-mask): from 70% of the height to 97%. */
function fadeAt(y: number) {
  return Math.min(1, Math.max(0, (VIEW_H * 0.97 - y) / (VIEW_H * 0.27)));
}

/**
 * Where a ball sits, as a CSS transform: its box's top-left, in the stage's container width
 * (1 view unit = 0.1cqw, since the view is 1000 units wide), so it scales with the stage.
 */
function ballTransform(x: number, y: number, size: number) {
  const r = 16 * size;
  return `translate3d(${((x - r) / 10).toFixed(2)}cqw, ${((y - r) / 10).toFixed(2)}cqw, 0)`;
}

function pointOn(ring: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + RINGS[ring] * Math.cos(a), y: CY + RINGS[ring] * Math.sin(a) };
}

function MemberChip({ person, open, onHover }: { person: TeamMember; open: boolean; onHover: (on: boolean) => void }) {
  return (
    <div
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      className={cn(
        "flex items-center rounded-full border p-1 transition-[background-color,border-color,box-shadow] duration-500 ease-reveal",
        open
          ? "border-flare/45 bg-[linear-gradient(90deg,rgb(200_74_26/0.95),rgb(102_42_17/0.92))] shadow-[0_0_28px_-6px_rgb(245_124_72/0.55)]"
          : "border-flare/35 bg-ember-2/40",
      )}
    >
      <span className="relative block size-(--avatar) shrink-0 overflow-hidden rounded-full bg-[radial-gradient(90%_90%_at_50%_30%,#a83f13_55%,#7a2e0e_100%)]">
        {person.photo ? (
          <Image src={person.photo} alt="" fill sizes="52px" className={cn("object-cover object-top transition-[filter] duration-500", !open && "grayscale")} />
        ) : (
          <Silhouette className="text-[#2b0e04]/60" />
        )}
      </span>
      <span
        className={cn(
          // Phones show avatars only: the rings run past the screen edges there, so a pill could open off-screen.
          "grid transition-[grid-template-columns,opacity] duration-600 ease-reveal max-sm:hidden",
          open ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
        )}
      >
        <span className="overflow-hidden">
          <span className="block max-w-[11rem] truncate pr-4 pl-2.5 text-left leading-tight whitespace-nowrap">
            <span className="block text-[clamp(0.72rem,1.25cqw,0.9rem)] font-medium text-white">{person.name}</span>
            <span className="block text-[clamp(0.62rem,1.05cqw,0.76rem)] text-white/80">{person.role}</span>
          </span>
        </span>
      </span>
    </div>
  );
}

export function JoinCommunity({ members }: { members: TeamMember[] }) {
  const reduceMotion = useReducedMotion() ?? false;
  const chips = members.slice(0, CHIP_SPOTS.length);
  const chipCount = chips.length;

  // Whether the rings are on screen: the balls and the chips only move while they are.
  const stageRef = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  // Which chips are open, oldest first; one closes and another opens every CYCLE_MS.
  const [openOrder, setOpenOrder] = useState<number[]>([0, 2, 4]);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    if (reduceMotion || chipCount <= OPEN_AT_ONCE) return;
    const id = setInterval(() => {
      if (!visible.current) return;
      const pick = Math.random();
      setOpenOrder((current) => {
        const closed = Array.from({ length: chipCount }, (_, i) => i).filter((i) => !current.includes(i));
        const next = closed[Math.floor(pick * closed.length)];
        return [...current.slice(current.length >= OPEN_AT_ONCE ? 1 : 0), next];
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, chipCount]);

  // Glowing balls move along their rings. They're their own layers above the SVG, moved with
  // transforms the graphics chip applies without repainting (inside the masked SVG, every
  // move repainted the whole orbit through its mask).
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const elapsed = useRef(0);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  useAnimationFrame((_, delta) => {
    if (reduceMotion || !visible.current) return;
    elapsed.current += Math.min(delta, 64) / 1000;
    BALLS.forEach((ball, i) => {
      const { x, y } = pointOn(ball.ring, ball.start + ball.speed * elapsed.current);
      const el = ballRefs.current[i];
      if (!el) return;
      el.style.transform = ballTransform(x, y, ball.size);
      el.style.opacity = fadeAt(y).toFixed(3);
    });
  });

  return (
    <section aria-labelledby="community-title" className="relative overflow-hidden px-5 pb-[clamp(1rem,2vw,3rem)]">
      <div
        aria-hidden
        className="bg-ribs pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_55%_at_50%_55%,#000,transparent)] opacity-60"
      />

      <div
        ref={stageRef}
        className="@container relative left-1/2 aspect-[1000/700] w-[max(100%,40rem)] max-w-[72rem] -translate-x-1/2 [--avatar:clamp(30px,4.4cqw,50px)]"
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id="orbit-fade" x1="0" y1="0" x2="0" y2={VIEW_H} gradientUnits="userSpaceOnUse">
              <stop offset="0.7" stopColor="#fff" />
              <stop offset="0.97" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="orbit-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width={VIEW_W + 200} height={VIEW_H + 200}>
              <rect x="-100" y="-100" width={VIEW_W + 200} height={VIEW_H + 200} fill="url(#orbit-fade)" />
            </mask>
            <radialGradient id="core-glow">
              <stop offset="0" stopColor="#662a11" stopOpacity="0.55" />
              <stop offset="1" stopColor="#662a11" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={RINGS[0] * 0.95} fill="url(#core-glow)" />

          <g mask="url(#orbit-mask)">
            {RINGS.map((r) => (
              <g key={r} fill="none">
                <circle cx={CX} cy={CY} r={r} stroke="#f57c48" strokeOpacity="0.14" strokeWidth="7" />
                <circle cx={CX} cy={CY} r={r} stroke="#f57c48" strokeOpacity="0.7" strokeWidth="1.4" />
              </g>
            ))}
          </g>
        </svg>

        {/* The glowing balls (see ballRefs). */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {BALLS.map((ball, i) => {
            const { x, y } = pointOn(ball.ring, ball.start);
            return (
              <div
                key={i}
                ref={(el) => {
                  ballRefs.current[i] = el;
                }}
                className="absolute top-0 left-0 grid place-items-center rounded-full bg-[radial-gradient(closest-side,rgb(255_243_234/0.95),rgb(245_124_72/0.7)_25%,rgb(245_124_72/0))] will-change-transform"
                style={{ width: `${(32 * ball.size) / 10}cqw`, height: `${(32 * ball.size) / 10}cqw`, transform: ballTransform(x, y, ball.size), opacity: fadeAt(y) }}
              >
                <span className="block rounded-full bg-[#fff6ef]" style={{ width: `${(6.8 * ball.size) / 10}cqw`, height: `${(6.8 * ball.size) / 10}cqw` }} />
              </div>
            );
          })}
        </div>

        {/* Juro's spot: the bottom-right corner, where the rings have faded out and no chip rests.
            On the right, below his Our History spot, so he glides straight down to it. */}
        <JuroSpot name="community" className="absolute right-[1%] bottom-[1%] hidden md:block" />

        {/* Decorative: the same people are listed properly on /team. */}
        <div aria-hidden>
          {chips.map((person, i) => {
            const { x, y } = pointOn(CHIP_SPOTS[i].ring, CHIP_SPOTS[i].angle);
            return (
              <div
                key={person.id}
                className="absolute"
                style={{
                  left: `${(x / VIEW_W) * 100}%`,
                  top: `${(y / VIEW_H) * 100}%`,
                  // Pin the avatar's centre (not the chip's) to the ring; the chip opens to the right.
                  translate: "calc(var(--avatar) / -2 - 5px) -50%",
                }}
              >
                <MemberChip
                  person={person}
                  open={reduceMotion || hovered === i || openOrder.includes(i)}
                  onHover={(on) => setHovered(on ? i : null)}
                />
              </div>
            );
          })}
        </div>

        <div
          className="absolute left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ top: `${(CY / VIEW_H) * 100}%` }}
        >
          <h2 id="community-title" className="font-heading text-[clamp(1.9rem,5.2cqw,3.9rem)] leading-[1.15]">
            <MaskReveal className="[-webkit-text-stroke:0]">Join Our</MaskReveal>
            <MaskReveal className="text-flare">Community</MaskReveal>
          </h2>
          <Reveal delay={0.2} className="mt-[clamp(1.25rem,3cqw,2.25rem)] flex justify-center">
            <PillButton href={joinLink.href}>{joinLink.label}</PillButton>
          </Reveal>
        </div>
      </div>

      {/* On phones the orbit runs past the screen edges, so Juro gets a space of his own below it. */}
      <div className="flex justify-center md:hidden">
        <JuroSpot name="community" />
      </div>
    </section>
  );
}
