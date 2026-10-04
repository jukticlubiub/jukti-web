"use client";

import { useSyncExternalStore } from "react";

let support: boolean | undefined;

function hasWebGL() {
  if (support === undefined) {
    try {
      const canvas = document.createElement("canvas");
      support = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      support = false;
    }
  }
  return support;
}

const noSubscribe = () => () => {};

/** Whether this browser can draw WebGL. False while server rendering and hydrating. */
export function useHasWebGL() {
  return useSyncExternalStore(noSubscribe, hasWebGL, () => false);
}
