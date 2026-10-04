"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const MAX_TILT_DEG = 4;
const tiltSpring = { stiffness: 220, damping: 22, mass: 0.6 };

/**
 * Reports the pointer's position inside `ref` (0..1), once per frame, for effects such
 * as tilt. (The glow itself follows the cursor through GlassPointerTracker.)
 */
export function useGlassPointer<T extends HTMLElement>(onMove: (x: number, y: number) => void) {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  const handlers = {
    onPointerMove(e: React.PointerEvent<T>) {
      if (e.pointerType !== "mouse") return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        onMoveRef.current((clientX - r.left) / r.width, (clientY - r.top) / r.height);
      });
    },
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { ref, handlers };
}

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
};

/** Frosted glass panel with a cursor-following sheen, edge highlight, and a gentle tilt. */
export function GlassCard({ children, className, tilt = true }: GlassCardProps) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);
  const canTilt = tilt && !reduceMotion;

  const { ref, handlers } = useGlassPointer<HTMLDivElement>((x, y) => {
    if (!canTilt) return;
    rotateY.set((x - 0.5) * 2 * MAX_TILT_DEG);
    rotateX.set(-(y - 0.5) * 2 * MAX_TILT_DEG);
  });

  return (
    <motion.div
      ref={ref}
      {...handlers}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
      style={canTilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      className={cn("glass-card", className)}
    >
      {children}
    </motion.div>
  );
}
