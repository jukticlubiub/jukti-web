"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

/** A thin lava line across the top of the screen showing how far through the article you are. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 220, damping: 32, restDelta: 0.001 });

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const distance = rect.height - window.innerHeight * 0.6;
        const read = window.innerHeight * 0.3 - rect.top;
        progress.set(Math.min(1, Math.max(0, distance > 0 ? read / distance : 1)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId, progress]);

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-[linear-gradient(90deg,#c84a1a,#f57c48)] shadow-[0_0_14px_rgb(245_124_72/0.8)]"
    />
  );
}
