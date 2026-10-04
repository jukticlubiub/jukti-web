"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { MARK_PIECES, MARK_VIEWBOX } from "@/components/brand/logo-paths";

/*
 * The JUKTI mark in 3D, built from the logo's own eight pieces (four triangles, two
 * pearls, two arcs), each extruded and lit like glossy plastic. Drag to spin it (it
 * keeps its momentum), hover to spread the pieces apart, click to scatter them; they
 * always settle back into the mark.
 */

const [, , VIEW_W, VIEW_H] = MARK_VIEWBOX.split(" ").map(Number);
/** World units per SVG unit: the mark is 3 units tall. */
const S = 3 / VIEW_H;
const IDLE_SPIN = 0.32; // rad/s
const HOVER_SPREAD = 0.16;
const BURST_SPREAD = 1.15;
const BURST_MS = 650;

type Piece = {
  name: string;
  geometry: THREE.ExtrudeGeometry;
  home: THREE.Vector3; // where the piece sits in the mark
  out: THREE.Vector3; // unit direction it moves when the mark spreads
  glow: boolean;
};

function usePieces(): Piece[] {
  return useMemo(() => {
    const loader = new SVGLoader();
    return Object.entries(MARK_PIECES).map(([name, d], i) => {
      const { paths } = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
      const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: 44,
        bevelEnabled: true,
        bevelThickness: 9,
        bevelSize: 6,
        bevelSegments: 8,
        curveSegments: 40,
      });
      geometry.computeBoundingBox();
      const c = new THREE.Vector3();
      geometry.boundingBox!.getCenter(c);
      geometry.translate(-c.x, -c.y, -c.z);
      // SVG y runs down; the meshes are flipped (negative y scale), so flip positions too.
      const home = new THREE.Vector3((c.x - VIEW_W / 2) * S, -(c.y - VIEW_H / 2) * S, 0);
      const out = new THREE.Vector3(home.x, home.y, (i % 2 ? 1 : -1) * 0.6).normalize();
      return { name, geometry, home, out, glow: name.startsWith("pearl") };
    });
  }, []);
}

function Mark({ reduceMotion }: { reduceMotion: boolean }) {
  const pieces = usePieces();
  const spin = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef({
    hovered: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: 0,
    velocity: reduceMotion ? 0 : IDLE_SPIN,
    tiltTarget: 0,
    burstAt: -Infinity,
    spread: 0,
  });
  const [cursor, setCursor] = useState<"grab" | "grabbing" | "auto">("auto");

  useEffect(() => {
    document.body.style.cursor = cursor === "auto" ? "" : cursor;
    return () => {
      document.body.style.cursor = "";
    };
  }, [cursor]);

  // Dragging continues outside the canvas.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.dragging || !spin.current) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.moved += Math.abs(dx) + Math.abs(dy);
      spin.current.rotation.y += dx * 0.012;
      s.velocity = (dx * 0.012) / (1 / 60);
      s.tiltTarget = THREE.MathUtils.clamp(s.tiltTarget + dy * 0.006, -0.6, 0.6);
    };
    const onUp = () => {
      const s = state.current;
      if (!s.dragging) return;
      s.dragging = false;
      setCursor(s.hovered ? "grab" : "auto");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    const s = state.current;
    const g = spin.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;

    // Spin: free momentum after a drag, easing back to a slow idle turn.
    if (!s.dragging) {
      const idle = reduceMotion ? 0 : IDLE_SPIN;
      s.velocity += (idle - s.velocity) * (1 - Math.exp(-1.6 * dt));
      g.rotation.y += s.velocity * dt;
      s.tiltTarget *= Math.exp(-1.2 * dt);
    }
    // Lean a little toward the cursor, and bob.
    const lean = s.tiltTarget + (s.dragging ? 0 : -pointer.y * 0.18);
    g.rotation.x += (lean - g.rotation.x) * (1 - Math.exp(-6 * dt));
    g.rotation.z += ((s.dragging ? 0 : pointer.x * 0.08) - g.rotation.z) * (1 - Math.exp(-4 * dt));
    g.position.y = reduceMotion ? 0 : Math.sin(t * 1.3) * 0.08;

    // Spread: a little on hover, a lot right after a click, then home again.
    const burst = performance.now() - s.burstAt < BURST_MS;
    const target = burst ? BURST_SPREAD : s.hovered || s.dragging ? HOVER_SPREAD : 0;
    s.spread += (target - s.spread) * (1 - Math.exp(-(burst ? 9 : 5) * dt));
    pieces.forEach((p, i) => {
      const m = meshes.current[i];
      if (!m) return;
      m.position.copy(p.home).addScaledVector(p.out, s.spread);
      const wobble = s.spread * (i % 2 ? 1 : -1);
      m.rotation.set(wobble * 0.9, wobble * 0.6, 0);
    });
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = state.current;
    s.dragging = true;
    s.moved = 0;
    s.lastX = e.nativeEvent.clientX;
    s.lastY = e.nativeEvent.clientY;
    setCursor("grabbing");
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (state.current.moved > 6) return; // that was a drag
    state.current.burstAt = performance.now();
    state.current.velocity += reduceMotion ? 0 : 7;
  };

  const materials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({
        color: "#f58839",
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffd2b0"),
      }),
      pearl: new THREE.MeshPhysicalMaterial({
        color: "#fff4ec",
        emissive: new THREE.Color("#ffb38a"),
        emissiveIntensity: 0.55,
        roughness: 0.12,
        clearcoat: 1,
        iridescence: 0.8,
      }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    }),
    [],
  );

  return (
    <group ref={spin}>
      {/* An invisible box around the mark, so hovering the gaps between pieces still counts. */}
      <mesh
        material={materials.hit}
        onPointerOver={() => {
          state.current.hovered = true;
          if (!state.current.dragging) setCursor("grab");
        }}
        onPointerOut={() => {
          state.current.hovered = false;
          if (!state.current.dragging) setCursor("auto");
        }}
        onPointerDown={onDown}
        onClick={onClick}
      >
        <boxGeometry args={[VIEW_W * S * 1.1, VIEW_H * S * 1.05, 0.9]} />
      </mesh>
      {pieces.map((p, i) => (
        <mesh
          key={p.name}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={p.geometry}
          material={p.glow ? materials.pearl : materials.body}
          position={p.home}
          scale={[S, -S, S]}
          raycast={() => null}
        />
      ))}
    </group>
  );
}

/** The interactive 3D mark, filling its parent. Renders only while on screen. */
export default function JuktiMark3D({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="absolute inset-0 touch-pan-y">
      <Canvas
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 8.4], fov: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        aria-hidden
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[-3, 4, 5]} intensity={2.2} />
        <pointLight position={[3, -1, 2.5]} intensity={14} color="#f57c48" />
        <pointLight position={[-2.5, 1.5, -2.5]} intensity={10} color="#ffd2b0" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.6} position={[0, 3, 2]} rotation-x={Math.PI / 2} scale={[5, 1.4, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#fff1e6" position={[-3, 0.6, 1.5]} rotation-y={Math.PI / 2} scale={[1.2, 3, 1]} />
          <Lightformer form="ring" intensity={2.4} color="#f57c48" position={[3, 0.4, -1.5]} scale={1.8} />
          <Lightformer form="rect" intensity={0.8} position={[0, -2, 3]} rotation-x={-Math.PI / 2} scale={[4, 1, 1]} />
        </Environment>
        <Mark reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  );
}
