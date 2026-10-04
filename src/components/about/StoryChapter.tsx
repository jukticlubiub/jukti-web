"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { StoryChapter as Chapter } from "@/lib/data/story";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

/** A tint per chapter for its photo placeholder, so they're told apart (and colour has something to show). */
const HUES = [18, 330, 205, 265, 290, 160, 40];

const MAX_TILT = 11; // degrees

/**
 * A chapter's picture: black and white until the story reaches it (`colored`), when
 * colour washes in from the side the line comes from. Hovering paints colour in from
 * the cursor. Tilts in 3D toward the pointer, with its badges floating above it.
 */
function StoryCard({
  chapter,
  index,
  number,
  colored,
  from,
}: {
  chapter: Chapter;
  index: number;
  number: string;
  colored: boolean;
  /** Which edge the colour washes in from (the side the line is on). */
  from: "left" | "right";
}) {
  const reduceMotion = useReducedMotion();
  const card = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateY = useSpring(rawX, { stiffness: 180, damping: 18 });
  const rotateX = useSpring(rawY, { stiffness: 180, damping: 18 });
  const [hovering, setHovering] = useState(false);
  const [origin, setOrigin] = useState(from === "left" ? "0% 50%" : "100% 50%");

  const show = colored || hovering;

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (!reduceMotion) {
      rawX.set((x - 0.5) * 2 * MAX_TILT);
      rawY.set(-(y - 0.5) * 2 * MAX_TILT);
    }
    card.current?.style.setProperty("--shine-x", `${x * 100}%`);
    card.current?.style.setProperty("--shine-y", `${y * 100}%`);
  };

  const onEnter = (e: React.PointerEvent) => {
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    setHovering(true);
  };

  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
    setHovering(false);
  };

  const picture = (grey: boolean) =>
    chapter.photo ? (
      <Image
        src={chapter.photo.src}
        alt={grey ? chapter.photo.alt : ""}
        fill
        sizes="(max-width: 768px) 100vw, 45vw"
        className="object-cover"
      />
    ) : (
      <PhotoPlaceholder hint={chapter.photoHint} label={chapter.kicker} hue={HUES[index % HUES.length]} decorative={!grey} />
    );

  return (
    <motion.div
      ref={card}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }}
      className="group/card relative"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_40px_90px_-40px_rgb(0_0_0/0.9)]">
        {/* Black and white underneath... */}
        <div className="absolute inset-0 brightness-[0.78] contrast-[1.08] grayscale">{picture(true)}</div>
        {/* ...and the colour version on top, revealed by a growing circle. */}
        <div
          aria-hidden
          className="absolute inset-0 transition-[clip-path] duration-[1400ms] ease-reveal"
          style={{ clipPath: `circle(${show ? "150%" : "0%"} at ${origin})` }}
        >
          {picture(false)}
        </div>
        {/* Glossy sheen that follows the cursor. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background: "radial-gradient(circle at var(--shine-x,50%) var(--shine-y,50%), rgb(255 255 255 / 0.22), transparent 45%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/10 ring-inset" />
      </div>

      {/* Floating above the picture (they lift off it as it tilts). */}
      <span
        className="absolute -top-4 left-5 rounded-full border border-white/15 bg-black/70 px-3.5 py-1.5 text-[0.78rem] font-medium tracking-[0.08em] text-fg uppercase shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md"
        style={{ transform: "translateZ(70px)" }}
      >
        {chapter.badge}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute -right-3 -bottom-5 grid size-14 place-items-center rounded-full font-display text-[0.95rem] transition-[background-color,color,box-shadow] duration-700",
          show ? "bg-lava text-white shadow-[0_0_34px_rgb(245_124_72/0.65)]" : "border border-white/20 bg-black/80 text-muted",
        )}
        style={{ transform: "translateZ(46px)" }}
      >
        {number}
      </span>
    </motion.div>
  );
}

/**
 * One chapter of the story: its milestone dot (on the line), number, title and text,
 * and its picture on the other side. `textSide` alternates down the page; on phones
 * everything stacks to the right of the line.
 */
export function StoryChapter({
  chapter,
  index,
  colored,
  lit,
  textSide,
  nodeRef,
  rowRef,
}: {
  chapter: Chapter;
  index: number;
  colored: boolean;
  lit: boolean;
  textSide: "left" | "right";
  nodeRef: (el: HTMLSpanElement | null) => void;
  rowRef: (el: HTMLLIElement | null) => void;
}) {
  const number = String(index + 1).padStart(2, "0");
  return (
    <li ref={rowRef} className="relative grid items-start gap-12 md:grid-cols-2 md:gap-[clamp(4rem,8vw,9rem)]">
      <div className={cn("relative pl-11 md:pl-14", textSide === "right" && "md:order-2")}>
        {/* The milestone dot. The story line runs through its centre. */}
        <span
          ref={nodeRef}
          aria-hidden
          className={cn(
            "absolute top-[0.55rem] left-0 size-4 rounded-full border transition-[background-color,border-color,box-shadow,scale] duration-500",
            lit
              ? "scale-110 border-flare bg-flare shadow-[0_0_0_6px_rgb(245_124_72/0.15),0_0_26px_rgb(245_124_72/0.9)]"
              : "border-white/35 bg-black",
          )}
        />
        <span aria-hidden className="absolute top-[-0.15rem] left-5 size-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-white/30" />

        <p className={cn("flex items-center gap-2 text-[0.95rem] tracking-[0.02em] transition-colors duration-500", lit ? "text-flare" : "text-muted")}>
          {chapter.kicker}
          <span aria-hidden className="inline-block -rotate-45">→</span>
        </p>
        <p aria-hidden className="mt-3 text-[clamp(4rem,8vw,7.5rem)] leading-[0.85] font-extralight tracking-[-0.06em] text-fg">
          {number}
        </p>
        <h2 className="mt-5 text-[clamp(1.45rem,2.3vw,2.25rem)] leading-[1.15] font-normal tracking-[-0.02em] text-fg">
          <span className="text-flare">{number}.</span> {chapter.title}
        </h2>
        <p className="mt-5 max-w-xl text-[clamp(1.02rem,1.15vw,1.15rem)] leading-[1.75] text-body/85">{chapter.body}</p>
        {chapter.link && (
          <Link href={chapter.link.href} className="group mt-6 inline-flex items-center gap-2 text-[0.95rem] text-flare">
            {chapter.link.label}
            <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      <div className="pl-11 md:px-2">
        <StoryCard chapter={chapter} index={index} number={number} colored={colored} from={textSide === "right" ? "right" : "left"} />
      </div>
    </li>
  );
}
