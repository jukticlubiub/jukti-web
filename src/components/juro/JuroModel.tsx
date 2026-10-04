"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { JuroBrain } from "./brain";

/*
 * Juro, built from the character sheet. Units: the head is 1.0 wide; every other
 * size is measured off the front and side views relative to it. The body's centre
 * is the origin, the head sits on a pivot at the top of the neck, and each arm
 * hangs from a shoulder pivot with an elbow pivot halfway down.
 */

const HEAD = { w: 1, h: 0.94, d: 0.76, r: 0.14 };
const BODY = { w: 0.72, h: 0.76, d: 0.52, r: 0.18 };
const NECK_TOP = BODY.h / 2 + 0.11;
const SHOULDER = { x: 0.49, y: 0.25 };
const UPPER_ARM = { r: 0.095, len: 0.14 };
const FOREARM = { r: 0.088, len: 0.12 };
const ELBOW_Y = -(UPPER_ARM.len + UPPER_ARM.r * 2);
const EYE = { r: 0.05, len: 0.11, x: 0.193, y: -0.036 };

// Timeline (seconds after the canvas starts).
const ENTER_DELAY = 0.5;
const ENTER_DURATION = 1.1;
const FIRST_WAVE_AT = ENTER_DELAY + 0.7;
const WAVE_DURATION = 3;
const GREETING = "Hi, I'm Juro!";

type Rig = {
  root: THREE.Group | null;
  float: THREE.Group | null;
  head: THREE.Group | null;
  eyes: THREE.Group | null;
  eyeL: THREE.Mesh | null;
  eyeR: THREE.Mesh | null;
  armL: THREE.Group | null; // viewer's left: the waving / pointing arm
  armR: THREE.Group | null;
  elbowL: THREE.Group | null;
  elbowR: THREE.Group | null;
};

type AnimState = {
  enterStart: number;
  seenEnterId: number;
  waveStart: number;
  waveMessage: string;
  seenWaveId: number;
  saying: boolean;
  velocity: number;
  point: number;
  pointAngle: number; // how far up the pointing arm is raised, radians from hanging down
  pointSide: -1 | 1; // which arm points: -1 his arm on the viewer's left, 1 the right
  happy: number;
  away: number;
  yaw: number;
  pitch: number;
  eyeX: number;
  eyeY: number;
  nextBlink: number;
  blinkStart: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
/** Frame-rate independent approach: move `current` toward `target` at `rate` per second. */
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

const headWorld = new THREE.Vector3();

/** Flat rounded rectangle, centred on the origin, facing +z. */
function roundedRect(w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(shape, 12);
}

/** Everything Juro does, once per frame. Kept outside React so the rig can be mutated freely. */
function animate(
  rig: Rig,
  brain: JuroBrain,
  a: AnimState,
  t: number,
  dt: number,
  camera: THREE.Camera,
  canvas: DOMRect,
) {
  const { root, float, head, eyes, eyeL, eyeR, armL, armR, elbowL, elbowR } = rig;
  if (!root || !float || !head || !eyes || !eyeL || !eyeR || !armL || !armR || !elbowL || !elbowR) return;
  const still = brain.reducedMotion;

  // Entrance replays (popping back up at the top of the page) greet the visitor again.
  if (brain.enterId !== a.seenEnterId) {
    a.seenEnterId = brain.enterId;
    a.enterStart = t + 0.05;
    a.waveStart = a.enterStart + (FIRST_WAVE_AT - ENTER_DELAY);
    a.waveMessage = GREETING;
  }

  // Waves: the first one greets the visitor; later ones are requested by the page.
  if (brain.waveRequest.id !== a.seenWaveId) {
    a.seenWaveId = brain.waveRequest.id;
    a.waveStart = t;
    a.waveMessage = brain.waveRequest.message;
  }
  const waveT = t - a.waveStart;
  const waving = !still && waveT >= 0 && waveT < WAVE_DURATION;
  if (waving !== a.saying) {
    a.saying = waving;
    brain.say(waving ? a.waveMessage : null);
  }
  const wave = waving ? smooth(0, 0.35, waveT) * (1 - smooth(WAVE_DURATION - 0.45, WAVE_DURATION, waveT)) : 0;

  // Entrance: pops up from below with a little overshoot (at the top of the page, from
  // behind the bottom edge of the screen), on page load and again when the page asks. With no free spot on screen (the footer), he
  // ducks back down the same way, after any goodbye wave.
  const enter = still ? 1 : clamp((t - a.enterStart) / ENTER_DURATION, 0, 1);
  a.away = approach(a.away, brain.away && !waving ? 1 : 0, 2.5, dt);
  const e = easeOutBack(enter) * (1 - smooth(0, 1, a.away));
  root.position.set(0, lerp(-2.8, 0, e), 0);
  root.rotation.z = lerp(-0.18, 0, smooth(0, 1, enter) * (1 - a.away));
  root.visible = (t > a.enterStart || still) && a.away < 0.98 && !brain.hidden;

  // Scroll: lean and swing with the page's momentum.
  brain.scrollVelocity *= Math.exp(-dt * 6);
  a.velocity = approach(a.velocity, still ? 0 : brain.scrollVelocity, 8, dt);
  const lean = clamp(a.velocity / 2500, -1, 1);

  // Where his head is on screen, and which way the cursor and his focus are from it.
  head.getWorldPosition(headWorld);
  headWorld.y += HEAD.h * 0.5;
  headWorld.project(camera);
  const hx = canvas.left + ((headWorld.x + 1) / 2) * canvas.width;
  const hy = canvas.top + ((1 - headWorld.y) / 2) * canvas.height;
  const toward = (p: { x: number; y: number }) =>
    [clamp((p.x - hx) / 520, -1, 1), clamp((p.y - hy) / 420, -1, 1)] as const;
  const focus = brain.focus;
  const [cx, cy] = brain.pointer
    ? toward(brain.pointer)
    : focus
      ? toward(focus)
      : still
        ? [0, 0]
        : [-0.35 + 0.25 * Math.sin(t * 0.4), -0.1 + 0.1 * Math.sin(t * 0.55)];
  const [fx, fy] = focus ? toward(focus) : [cx, cy];

  // Moods: excited and pointing in the community section, happy when greeting or hovered.
  const pointing = brain.mode === "community" && focus !== null && !waving;
  a.point = approach(a.point, pointing ? 1 : 0, 3, dt);
  a.happy = approach(a.happy, waving || brain.hovered || brain.mode === "community" ? 1 : 0, 6, dt);
  if (focus) {
    const dx = focus.x - hx;
    if (Math.abs(dx) > 24) a.pointSide = dx < 0 ? -1 : 1; // no flip-flopping when it's straight above
    a.pointAngle = approach(a.pointAngle, Math.atan2(Math.abs(dx), focus.y - hy), 6, dt);
  }

  // Float: hover bob (livelier when excited), tilt with the scroll.
  const excited = a.point;
  const bob = still ? 0 : 0.045 * Math.sin(t * 1.7) + excited * 0.05 * Math.sin(t * 3.4);
  float.position.y = bob - lean * 0.12;
  float.rotation.x = -lean * 0.28;
  float.rotation.z = still ? 0 : 0.035 * Math.sin(t * 0.9) - wave * 0.06;

  // Arms. Rotation about z: negative raises the viewer-left arm outward, positive the right.
  // Pointing uses whichever arm faces the target; the other bounces with excitement.
  const sway = still ? 0 : 0.05 * Math.sin(t * 1.7 + 0.6);
  const restL = -0.07 - sway;
  const restR = 0.07 + sway;
  const aim = clamp(a.pointAngle, 0.5, 2.8) + 0.06 * Math.sin(t * 3);
  const bounce = excited * 0.25 * Math.max(0, Math.sin(t * 3.4));
  const pointL = a.pointSide < 0 ? a.point : 0;
  const pointR = a.pointSide > 0 ? a.point : 0;
  armL.rotation.z = lerp(lerp(restL - (pointR > 0 ? bounce : 0), -aim, pointL), -2.55, wave);
  armL.rotation.x = lean * 0.45 * (1 - wave);
  elbowL.rotation.z = wave * (-0.3 + 0.55 * Math.sin(waveT * Math.PI * 2 * 2.1)) - pointL * 0.15;
  armR.rotation.z = lerp(restR + (pointL > 0 ? bounce : 0), aim, pointR);
  armR.rotation.x = lean * 0.45;
  elbowR.rotation.z = 0.08 + pointR * 0.15;

  // Head turns mostly toward his focus (if any); the eyes always follow the cursor.
  const focusWeight = focus ? 0.65 : 0;
  a.yaw = approach(a.yaw, lerp(cx, fx, focusWeight) * 0.42, 7, dt);
  a.pitch = approach(a.pitch, lerp(cy, fy, focusWeight) * 0.24, 7, dt);
  head.rotation.y = a.yaw;
  head.rotation.x = a.pitch;
  head.rotation.z = wave * 0.12;

  a.eyeX = approach(a.eyeX, cx * 0.11, 12, dt);
  a.eyeY = approach(a.eyeY, -cy * 0.075, 12, dt);
  eyes.position.x = a.eyeX;
  eyes.position.y = HEAD.h / 2 + EYE.y + a.eyeY + a.happy * 0.02;

  // Blink every few seconds; squint into happy eyes when greeting, hovered or excited.
  if (t > a.nextBlink) {
    a.blinkStart = t;
    a.nextBlink = t + 2.4 + Math.random() * 3.6;
  }
  const blink = 1 - smooth(0, 0.07, Math.abs(t - a.blinkStart - 0.07));
  const sy = (1 - 0.9 * blink) * (1 - 0.55 * a.happy);
  const sx = 1 + 0.28 * a.happy;
  eyeL.scale.set(sx, sy, 1);
  eyeR.scale.set(sx, sy, 1);
}

function Arm({ side, armRef, elbowRef, materials }: {
  side: -1 | 1;
  armRef: React.RefObject<THREE.Group | null>;
  elbowRef: React.RefObject<THREE.Group | null>;
  materials: ReturnType<typeof useJuroMaterials>;
}) {
  const upperMid = -(UPPER_ARM.len / 2 + UPPER_ARM.r);
  const foreMid = -(FOREARM.len / 2 + FOREARM.r);
  const handY = -(FOREARM.len + FOREARM.r * 2 + 0.03);
  return (
    <group ref={armRef} position={[side * SHOULDER.x, SHOULDER.y, 0]}>
      {/* Glowing shoulder cap */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.glow}>
        <torusGeometry args={[UPPER_ARM.r * 0.78, 0.018, 12, 32]} />
      </mesh>
      <mesh position={[0, upperMid, 0]} material={materials.white}>
        <capsuleGeometry args={[UPPER_ARM.r, UPPER_ARM.len, 8, 20]} />
      </mesh>
      <group ref={elbowRef} position={[0, ELBOW_Y, 0]}>
        <mesh material={materials.glow}>
          <cylinderGeometry args={[UPPER_ARM.r * 1.02, UPPER_ARM.r * 1.02, 0.045, 24]} />
        </mesh>
        <mesh position={[0, foreMid, 0]} material={materials.white}>
          <capsuleGeometry args={[FOREARM.r, FOREARM.len, 8, 20]} />
        </mesh>
        {/* Grey three-fingered hand */}
        <group position={[0, handY, 0]}>
          <mesh material={materials.metal}>
            <sphereGeometry args={[0.068, 20, 16]} />
          </mesh>
          {[-1, 0, 1].map((f) => (
            <mesh
              key={f}
              position={[f * 0.045, -0.075, f === 0 ? 0.025 : 0]}
              rotation={[0, 0, f * 0.3]}
              material={materials.metal}
            >
              <capsuleGeometry args={[0.024, 0.07, 4, 10]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function useJuroMaterials() {
  return useMemo(
    () => ({
      white: new THREE.MeshPhysicalMaterial({ color: "#f3f1ee", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.16 }),
      glow: new THREE.MeshStandardMaterial({ color: "#f57c48", emissive: "#f57c48", emissiveIntensity: 1.3, roughness: 0.3 }),
      panel: new THREE.MeshPhysicalMaterial({ color: "#ee6b2c", roughness: 0.38, clearcoat: 0.6 }),
      screen: new THREE.MeshPhysicalMaterial({ color: "#09090b", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
      eye: new THREE.MeshBasicMaterial({ color: "#fffaf4", toneMapped: false }),
      metal: new THREE.MeshStandardMaterial({ color: "#8c8e94", metalness: 0.7, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: "#2d2e32", metalness: 0.5, roughness: 0.45 }),
    }),
    [],
  );
}

/** The camera looks at the origin, so shift Juro down to put his middle there. */
const FRAME_OFFSET: [number, number, number] = [0, -0.52, 0];

export function JuroModel({ brain }: { brain: React.RefObject<JuroBrain> }) {
  const materials = useJuroMaterials();
  const shapes = useMemo(() => ({ rim: roundedRect(0.8, 0.755, 0.12), screen: roundedRect(0.76, 0.715, 0.1) }), []);
  const root = useRef<THREE.Group>(null);
  const float = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const anim = useRef<AnimState>({
    enterStart: ENTER_DELAY,
    seenEnterId: 0,
    waveStart: FIRST_WAVE_AT,
    waveMessage: GREETING,
    seenWaveId: 0,
    saying: false,
    velocity: 0,
    point: 0,
    pointAngle: 1.8,
    pointSide: -1,
    happy: 0,
    away: 0,
    yaw: 0,
    pitch: 0,
    eyeX: 0,
    eyeY: 0,
    nextBlink: 3,
    blinkStart: -1,
  });
  const gl = useThree((s) => s.gl);

  useFrame((state, delta) => {
    // Resolution to match his size on screen (see JuroBrain.resolution). Set here, just before
    // the frame is drawn, so the canvas is never shown cleared at the new size.
    const density = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const pixelRatio = density * brain.current.resolution;
    if (Math.abs(state.gl.getPixelRatio() - pixelRatio) > 1e-3) state.gl.setPixelRatio(pixelRatio);

    const rig: Rig = {
      root: root.current,
      float: float.current,
      head: head.current,
      eyes: eyes.current,
      eyeL: eyeL.current,
      eyeR: eyeR.current,
      armL: armL.current,
      armR: armR.current,
      elbowL: elbowL.current,
      elbowR: elbowR.current,
    };
    animate(
      rig,
      brain.current,
      anim.current,
      state.clock.elapsedTime,
      Math.min(delta, 0.05),
      state.camera,
      gl.domElement.getBoundingClientRect(),
    );
  });

  const headY = HEAD.h / 2;
  const face = HEAD.d / 2;

  return (
    <group position={FRAME_OFFSET}>
      <group ref={root}>
        <group ref={float}>
          {/* Body with its orange side vents and trim */}
          <RoundedBox args={[BODY.w, BODY.h, BODY.d]} radius={BODY.r} smoothness={5} material={materials.white} />
          {[-1, 1].map((s) => (
            <RoundedBox
              key={s}
              args={[0.04, 0.26, 0.2]}
              radius={0.018}
              position={[s * (BODY.w / 2 - 0.004), -0.06, 0]}
              material={materials.panel}
            />
          ))}
          {[-1, 1].map((s) => (
            <RoundedBox
              key={`pad${s}`}
              args={[0.1, 0.05, 0.03]}
              radius={0.015}
              position={[s * 0.2, -BODY.h / 2 + 0.09, BODY.d / 2 - 0.02]}
              material={materials.panel}
            />
          ))}
          <RoundedBox args={[0.26, 0.05, 0.1]} radius={0.02} position={[0, BODY.h / 2 - 0.005, 0.1]} material={materials.panel} />

          {/* Neck */}
          <mesh position={[0, BODY.h / 2 + 0.05, 0]} material={materials.dark}>
            <cylinderGeometry args={[0.085, 0.1, 0.12, 24]} />
          </mesh>
          <mesh position={[0, BODY.h / 2 + 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.glow}>
            <torusGeometry args={[0.092, 0.012, 10, 32]} />
          </mesh>

          {/* Head: pivots at the top of the neck */}
          <group ref={head} position={[0, NECK_TOP, 0]}>
            <RoundedBox args={[HEAD.w, HEAD.h, HEAD.d]} radius={HEAD.r} smoothness={6} position={[0, headY, 0]} material={materials.white} />
            {/* Glowing rim, then the black screen just in front of it: flat, so no bright bevel */}
            <mesh geometry={shapes.rim} position={[0, headY, face + 0.002]} material={materials.glow} />
            <mesh geometry={shapes.screen} position={[0, headY, face + 0.004]} material={materials.screen} />
            <group ref={eyes} position={[0, headY + EYE.y, 0]}>
              {[-1, 1].map((s) => (
                <mesh key={s} ref={s < 0 ? eyeL : eyeR} position={[s * EYE.x, 0, face + 0.03]} material={materials.eye}>
                  <capsuleGeometry args={[EYE.r, EYE.len, 6, 16]} />
                </mesh>
              ))}
            </group>
            {/* Ears: glowing orange rings with a grey centre */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * (HEAD.w / 2 + 0.004), headY + 0.073, 0]}>
                <mesh rotation={[0, Math.PI / 2, 0]} material={materials.glow}>
                  <torusGeometry args={[0.125, 0.032, 16, 40]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={materials.metal}>
                  <cylinderGeometry args={[0.1, 0.1, 0.03, 32]} />
                </mesh>
              </group>
            ))}
          </group>

          <Arm side={-1} armRef={armL} elbowRef={elbowL} materials={materials} />
          <Arm side={1} armRef={armR} elbowRef={elbowR} materials={materials} />
        </group>
      </group>
    </group>
  );
}
