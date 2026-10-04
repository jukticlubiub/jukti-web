"use client";

import { useEffect } from "react";

/**
 * Moves the glow of whichever `.glass-card` is under the mouse: writes the pointer's
 * position inside the card to `--mx` / `--my` (percent), which the card's sheen and
 * edge highlight follow (globals.css). One listener for the whole site, so every
 * glass card gets it, however it's rendered. Also updates while the page scrolls
 * under a still mouse, so the glow stays under the pointer.
 */
export function GlassPointerTracker() {
  useEffect(() => {
    let x = -1;
    let y = -1;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (x < 0) return;
      const card = document.elementFromPoint(x, y)?.closest<HTMLElement>(".glass-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${(((x - rect.left) / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(((y - rect.top) / rect.height) * 100).toFixed(1)}%`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      schedule();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
