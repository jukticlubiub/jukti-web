"use client";

import { useSyncExternalStore } from "react";

// One shared one-second clock for every countdown and status chip on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now || (now = Date.now());
const getServerSnapshot = () => null;

/**
 * The current time, ticking every second. Null while server rendering and hydrating,
 * so time-based UI renders the same on the server and the first client pass.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
