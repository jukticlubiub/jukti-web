"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has loaded and the browser has a quiet moment (or after `timeout` ms
 * at the latest): for heavy extras, like the 3D scenes, that shouldn't compete with the
 * first paint and the page becoming usable.
 */
export function useIdle(timeout = 2500) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let cancel = () => {};
    const schedule = () => {
      // Safari has no requestIdleCallback: a short timeout after load stands in.
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(() => setIdle(true), { timeout });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(() => setIdle(true), 300);
        cancel = () => clearTimeout(id);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      cancel();
    };
  }, [timeout]);
  return idle;
}
