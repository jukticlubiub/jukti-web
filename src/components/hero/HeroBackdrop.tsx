"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useHasWebGL } from "@/components/ui/useHasWebGL";
import { useIdle } from "@/components/ui/useIdle";
import { cn } from "@/lib/cn";

const EclipseCanvas = dynamic(() => import("./EclipseCanvas"), { ssr: false });

/**
 * The eclipse behind the hero. A CSS version (`.eclipse-fallback`) always paints first,
 * so there's no flash while the WebGL canvas loads, and it stays as the fallback
 * where WebGL isn't available (or would run without a graphics card). The canvas loads
 * once the page is idle, so it doesn't hold up the first paint, and cross-fades in once
 * its first frame is drawn.
 */
export function HeroBackdrop({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const webgl = useHasWebGL();
  const idle = useIdle();
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="eclipse-fallback pointer-events-none absolute inset-x-0 top-0 h-[130svh]">
      <div className="bg-ribs absolute inset-0" />
      {webgl && idle && (
        <div className={cn("absolute inset-0 transition-opacity duration-[1200ms] ease-reveal", ready ? "opacity-100" : "opacity-0")}>
          <EclipseCanvas
            progress={progress}
            paused={!visible}
            still={reduceMotion}
            onFirstFrame={() => setReady(true)}
          />
        </div>
      )}
    </div>
  );
}
