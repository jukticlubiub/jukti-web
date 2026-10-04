"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { eclipseFragment, eclipseVertex } from "./eclipse-shader";
import { HERO_TAIL, planetGeometry, ribWidth } from "./planet";

export type EclipseCanvasProps = {
  /** Scroll progress through the hero, 0 at the top. Written by the hero's ScrollTrigger. */
  progress: React.RefObject<number>;
  /** Pause rendering entirely, e.g. while the hero is off-screen. */
  paused: boolean;
  /** Render one still frame and stop animating. */
  still: boolean;
  onFirstFrame: () => void;
};

// A calm moment in the lava loop, used for the still frame.
const STILL_TIME = 14;
const HEAT_BASE = 1;
const HEAT_SCROLL_BOOST = 0.6;

function createUniforms() {
  return {
    uRes: { value: new THREE.Vector2() },
    uViewH: { value: 0 },
    uPlanet: { value: new THREE.Vector3() },
    uRib: { value: 32 },
    uDpr: { value: 1 },
    uMouse: { value: new THREE.Vector2() },
    uTime: { value: STILL_TIME },
    uHeat: { value: HEAT_BASE },
  };
}
type EclipseUniforms = ReturnType<typeof createUniforms>;
type Point = { x: number; y: number };

/** Canvas-size dependent uniforms. `width`/`height` are CSS px; uniforms are device px. */
function applyLayout(u: EclipseUniforms, width: number, height: number, dpr: number) {
  const heroH = height / (1 + HERO_TAIL);
  const { top, radius } = planetGeometry(width, heroH);
  u.uRes.value.set(width * dpr, height * dpr);
  u.uViewH.value = heroH * dpr;
  u.uPlanet.value.set((width / 2) * dpr, top * dpr, radius * dpr);
  u.uRib.value = ribWidth(width) * dpr;
  u.uDpr.value = dpr;
  u.uMouse.value.set((width / 2) * dpr, top * 0.85 * dpr);
}

/** Advances the lava, eases the scroll heat, and eases the light toward the pointer. */
function advanceFrame(
  u: EclipseUniforms,
  delta: number,
  scroll: number,
  pointer: Point | null,
  width: number,
  height: number,
  dpr: number,
) {
  u.uTime.value += Math.min(delta, 0.1);
  const heat = HEAT_BASE + HEAT_SCROLL_BOOST * scroll;
  u.uHeat.value += (heat - u.uHeat.value) * Math.min(1, delta * 4);

  // No mouse (touch, or not moved yet): let the light drift slowly on its own.
  const t = u.uTime.value;
  const heroH = height / (1 + HERO_TAIL);
  const target = pointer ?? {
    x: width * (0.5 + 0.28 * Math.sin(t * 0.13)),
    y: heroH * (0.55 + 0.08 * Math.sin(t * 0.21)),
  };
  const ease = 1 - Math.exp(-delta * 2.5);
  u.uMouse.value.x += (target.x * dpr - u.uMouse.value.x) * ease;
  u.uMouse.value.y += (target.y * dpr - u.uMouse.value.y) * ease;
}

function EclipsePlane({ progress, still, onFirstFrame }: Omit<EclipseCanvasProps, "paused">) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const lowPower = size.width < 768;

  const material = useRef<THREE.ShaderMaterial>(null);
  const initialUniforms = useMemo(() => createUniforms(), []);

  // Layout uniforms only change with the canvas size.
  useEffect(() => {
    const u = material.current?.uniforms as EclipseUniforms | undefined;
    if (u) applyLayout(u, size.width, size.height, dpr);
  }, [size, dpr]);

  // Pointer position relative to the canvas; the plane eases toward it each frame.
  const gl = useThree((s) => s.gl);
  const pointer = useRef<Point | null>(null);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl]);

  const firstFrame = useRef(true);
  useFrame((_, delta) => {
    const u = material.current?.uniforms as EclipseUniforms | undefined;
    if (!u) return;
    if (!still) advanceFrame(u, delta, progress.current ?? 0, pointer.current, size.width, size.height, dpr);
    if (firstFrame.current) {
      firstFrame.current = false;
      // Let the frame reach the screen before the CSS fallback cross-fades away.
      requestAnimationFrame(onFirstFrame);
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={eclipseVertex}
        fragmentShader={eclipseFragment}
        uniforms={initialUniforms}
        defines={{ OCTAVES: lowPower ? 3 : 4 }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function EclipseCanvas({ paused, still, ...rest }: EclipseCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      flat
      frameloop={paused ? "never" : still ? "demand" : "always"}
      gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <EclipsePlane still={still} {...rest} />
    </Canvas>
  );
}
