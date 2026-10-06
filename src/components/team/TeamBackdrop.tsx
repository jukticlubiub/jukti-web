"use client";

import { useEffect, useRef } from "react";

/**
 * Background for the Team page: the design's charcoal-to-black fall-off (sampled
 * from the reference) under the site's ribbed glass, plus a faint warm light that
 * follows the cursor across the title area.
 */
export function TeamBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${e.clientX - r.left}px`);
        el.style.setProperty("--gy", `${e.clientY - r.top}px`);
        el.style.setProperty("--glow", "1");
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#1b1816_0,#170d0a_13vw,#130907_24vw,#0d0605_33vw,#000_44vw)]" />
      <div className="bg-ribs absolute inset-x-0 top-0 h-[42vw] min-h-[26rem] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(38rem_circle_at_var(--gx,50%)_var(--gy,-30rem),rgb(245_124_72/0.14),transparent_70%)] opacity-(--glow,0) transition-opacity duration-700" />
      {/* An ember horizon just above the portraits, so the row reads as lit from behind. */}
      <div className="absolute inset-x-0 top-[26vw] mx-auto h-[14vw] min-h-40 max-w-[110rem] rounded-[100%] bg-[radial-gradient(closest-side,rgb(120_48_18/0.85),transparent)]" />
    </div>
  );
}
