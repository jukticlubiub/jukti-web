"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import type { EventCategory, EventPhoto } from "@/lib/events/types";
import { EventArt } from "./EventArt";
import { ArrowIcon, ArrowLeftIcon, CloseIcon } from "@/components/ui/icons";

function Photo({ photo, category, sizes, className }: { photo: EventPhoto; category: EventCategory; sizes: string; className?: string }) {
  return photo.url ? (
    <Image src={photo.url} alt={photo.alt} fill sizes={sizes} className={className} />
  ) : (
    <EventArt category={category} seed={photo.id} showGlyph={false} className={className} />
  );
}

/**
 * Photos from a past event: a masonry grid that opens into a full-screen viewer.
 * The viewer is a native modal <dialog> (focus stays inside, Esc closes it), with
 * arrow keys, buttons and swipes to move between photos.
 */
export function EventGallery({ photos, category, title }: { photos: EventPhoto[]; category: EventCategory; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const swipeStart = useRef<number | null>(null);
  const lenis = useLenis();

  const open = (i: number) => {
    setDirection(1);
    setIndex(i);
    dialog.current?.showModal();
  };

  const step = useCallback(
    (by: number) => {
      setDirection(by);
      setIndex((i) => (i === null ? i : (i + by + photos.length) % photos.length));
    },
    [photos.length],
  );

  const isOpen = index !== null;

  // Hold the page still behind the viewer.
  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      lenis?.start();
      root.style.overflow = previous;
    };
  }, [isOpen, lenis]);

  const current = index === null ? null : photos[index];

  return (
    <>
      <ul className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
        {photos.map((photo, i) => (
          <Reveal as="li" key={photo.id} delay={Math.min(i, 8) * 0.04} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`Open photo ${i + 1} of ${photos.length}${photo.alt ? `: ${photo.alt}` : ""}`}
              className="group relative block w-full overflow-hidden rounded-[16px] border border-glass-border"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Photo
                photo={photo}
                category={category}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-[scale] duration-700 ease-reveal group-hover:scale-[1.05]"
              />
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.45),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          </Reveal>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`${title} photos`}
        data-lenis-prevent
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => {
          // A click on the dark area around the photo closes the viewer.
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-fg backdrop-blur-md backdrop:bg-transparent open:flex open:flex-col"
      >
        {current && index !== null && (
          <>
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
              <p className="text-[0.95rem] text-body tabular-nums">
                <span className="font-display text-fg">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-muted"> / {String(photos.length).padStart(2, "0")}</span>
              </p>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Close"
                className="grid size-11 place-items-center rounded-full border border-glass-border bg-glass text-fg transition-colors hover:border-flare"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 sm:px-24"
              onPointerDown={(e) => {
                swipeStart.current = e.clientX;
              }}
              onPointerUp={(e) => {
                if (swipeStart.current === null) return;
                const dx = e.clientX - swipeStart.current;
                swipeStart.current = null;
                if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) dialog.current?.close();
              }}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={current.id}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: d * 60 }),
                    center: { opacity: 1, x: 0 },
                    exit: (d: number) => ({ opacity: 0, x: d * -60 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative max-h-full overflow-hidden rounded-[14px]"
                  style={{
                    aspectRatio: `${current.width} / ${current.height}`,
                    width: `min(100%, calc((100dvh - 11rem) * ${current.width / current.height}))`,
                  }}
                >
                  <Photo photo={current} category={category} sizes="100vw" className="object-contain" />
                </motion.div>
              </AnimatePresence>

              {photos.length > 1 && (
                <>
                  <NavButton label="Previous photo" onClick={() => step(-1)} className="left-3 sm:left-8">
                    <ArrowLeftIcon />
                  </NavButton>
                  <NavButton label="Next photo" onClick={() => step(1)} className="right-3 sm:right-8">
                    <ArrowIcon />
                  </NavButton>
                </>
              )}
            </div>

            <p className="min-h-16 px-6 py-5 text-center text-[0.95rem] text-body">{current.alt}</p>
          </>
        )}
      </dialog>
    </>
  );
}

function NavButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-glass-border bg-black/50 text-fg backdrop-blur-md transition-[border-color,background-color] hover:border-flare hover:bg-lava ${className}`}
    >
      {children}
    </button>
  );
}
