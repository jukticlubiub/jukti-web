"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useHasWebGL } from "@/components/ui/useHasWebGL";
import { cn } from "@/lib/cn";
import { createBrain, type JuroBrain } from "./brain";

const JuroCanvas = dynamic(() => import("./JuroCanvas"), { ssr: false });

/**
 * Juro standing in one place on a page (the homepage has its own, travelling Juro): he pops
 * up and waves with `message` in his speech bubble, and his eyes follow the cursor.
 * Clicking him waves again, saying `clickMessage`.
 */
export function JuroGreeter({ message, clickMessage = message, className }: { message: string; clickMessage?: string; className?: string }) {
  const brain = useRef<JuroBrain>({ ...createBrain(), greeting: message });
  const reduceMotion = useReducedMotion() ?? false;
  const webgl = useHasWebGL();
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    brain.current.reducedMotion = reduceMotion;
    brain.current.say = setBubble;
  }, [reduceMotion]);

  // Cursor, for the eyes.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") brain.current.pointer = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className={cn("relative aspect-[5/6] w-[clamp(170px,18vw,230px)]", className)}>
      {webgl && <JuroCanvas brain={brain} />}

      {/* Click target: only his body, not the transparent margin around him. */}
      <button
        type="button"
        aria-label="Juro, the JUKTI mascot. Click to wave."
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
          brain.current.waveRequest = { id: performance.now(), message: clickMessage };
        }}
        className="absolute inset-x-[24%] top-[20%] bottom-[20%] cursor-pointer rounded-[40%] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare"
      />

      {/* Speech bubble, centred over his head. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[90%] flex justify-center">
        <AnimatePresence>
          {bubble && (
            <motion.p
              key={bubble}
              role="status"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass origin-bottom rounded-2xl px-3.5 py-2 text-sm font-medium whitespace-nowrap text-fg shadow-[0_8px_30px_-10px_rgb(245_124_72/0.6)]"
            >
              {bubble}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
