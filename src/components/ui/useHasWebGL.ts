"use client";

import { useSyncExternalStore } from "react";

let support: boolean | undefined;

/**
 * WebGL backed by a graphics card. Without one (some phones and laptops, virtual machines,
 * and the headless browsers that measure page speed) the browser draws WebGL on the CPU,
 * and the full-screen hero or Juro would take over the processor: the CSS versions are used
 * instead. `failIfMajorPerformanceCaveat` is how the browser reports that software fallback.
 */
function hasWebGL() {
  if (support === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
      const gl = canvas.getContext("webgl2", options) ?? canvas.getContext("webgl", options);
      support = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      support = false;
    }
  }
  return support;
}

const noSubscribe = () => () => {};

/** Whether this browser can draw WebGL on a graphics card. False while server rendering and hydrating. */
export function useHasWebGL() {
  return useSyncExternalStore(noSubscribe, hasWebGL, () => false);
}
