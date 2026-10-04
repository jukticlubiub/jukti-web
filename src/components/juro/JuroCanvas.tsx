"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { JuroBrain } from "./brain";
import { JuroModel } from "./JuroModel";

/**
 * Juro's own small, transparent canvas. Studio lighting is built from light panels
 * (no HDR download), with a warm orange rim from behind so he sits in the site's glow.
 * The camera is far enough back that a raised or pointing arm fits on either side.
 */
export default function JuroCanvas({ brain }: { brain: React.RefObject<JuroBrain> }) {
  return (
    <Canvas
      dpr={[1, 2]}
      // His box is scaled with a CSS transform: measure its layout size, not its size on screen.
      resize={{ offsetSize: true, scroll: false }}
      camera={{ position: [0, 0, 5.8], fov: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.1} />
      <pointLight position={[2.4, 1.2, -1.6]} intensity={9} color="#f57c48" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 3, 2]} rotation-x={Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#fff1e6" position={[-3, 0.6, 1.5]} rotation-y={Math.PI / 2} scale={[1.2, 3, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#f57c48" position={[3, 0.4, -1.5]} scale={1.6} />
        <Lightformer form="rect" intensity={0.8} position={[0, -2, 3]} rotation-x={-Math.PI / 2} scale={[4, 1, 1]} />
      </Environment>
      <JuroModel brain={brain} />
    </Canvas>
  );
}
