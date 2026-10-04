"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { GlassPointerTracker } from "@/components/glass/GlassPointerTracker";

gsap.registerPlugin(ScrollTrigger);

/** Drives Lenis from GSAP's ticker so ScrollTrigger scenes and the scroll position stay in lockstep. */
function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);
    return () => {
      gsap.ticker.remove(update);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [lenis]);

  return null;
}

/**
 * Smooth scrolling, motion defaults, and the cursor glow on glass cards. Smooth
 * scrolling is skipped entirely for reduced motion.
 */
export function SiteProviders({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      {!reduceMotion && (
        <>
          <ReactLenis root options={{ autoRaf: false, lerp: 0.1 }} />
          <LenisGsapBridge />
        </>
      )}
      <GlassPointerTracker />
      {children}
    </MotionConfig>
  );
}
