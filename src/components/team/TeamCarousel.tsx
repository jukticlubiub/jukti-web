"use client";

import { useAnimationFrame, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { TeamMember } from "@/lib/data/team";
import { TeamMemberCard } from "./TeamMemberCard";

/** Idle drift, left to right. */
const SPEED_PX_S = 45;
/** After a drag or a sideways swipe, wait this long before drifting again. */
const RESUME_AFTER_MS = 1800;
/** A press that moves less than this is a click, not a drag. */
const DRAG_THRESHOLD_PX = 6;
/** Keep a focused card at least this far inside the viewport edge. */
const FOCUS_MARGIN_PX = 24;

type MarqueeState = {
  x: number; // track offset, always kept in [-setWidth, 0)
  setWidth: number; // width of one copy of the list, including its trailing gap
  speed: number; // current drift speed, eases toward 0 or SPEED_PX_S
  velocity: number; // momentum left over from a drag
  hovering: boolean;
  focused: boolean;
  visible: boolean;
  pointerId: number | null;
  dragging: boolean;
  dragged: boolean; // set once a press turns into a drag; swallows the click that follows
  startX: number;
  startOffset: number;
  lastX: number;
  lastT: number;
  lastInteraction: number;
};

const initialState = (): MarqueeState => ({
  x: 0,
  setWidth: 0,
  speed: 0,
  velocity: 0,
  hovering: false,
  focused: false,
  visible: true,
  pointerId: null,
  dragging: false,
  dragged: false,
  startX: 0,
  startOffset: 0,
  lastX: 0,
  lastT: 0,
  lastInteraction: 0,
});

/** Maps any offset into [-width, 0), where both copies line up seamlessly. */
function wrap(x: number, width: number) {
  return (((x % width) + width) % width) - width;
}

function LavaBand() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -inset-y-[45%] overflow-hidden">
      <span className="lava-blob [--c:rgb(102_42_17/1)] [--d:31s] [--s:52vw] [--x:8%] [--y:50%]" />
      <span className="lava-blob [--c:rgb(200_74_26/0.7)] [--d:23s] [--delay:-7s] [--s:38vw] [--x:32%] [--y:38%]" />
      <span className="lava-blob [--c:rgb(102_42_17/1)] [--d:27s] [--delay:-15s] [--s:56vw] [--x:56%] [--y:62%]" />
      <span className="lava-blob [--c:rgb(245_124_72/0.45)] [--d:19s] [--delay:-4s] [--s:30vw] [--x:76%] [--y:44%]" />
      <span className="lava-blob [--c:rgb(200_74_26/0.65)] [--d:35s] [--delay:-21s] [--s:46vw] [--x:96%] [--y:56%]" />
    </div>
  );
}

/**
 * The team (advisors, then the executive panel) as an endless row that drifts left to right when idle.
 * Hovering or focusing a card eases it to a stop; the row can also be dragged,
 * flicked, or swiped sideways on a trackpad, and it picks up again once left alone.
 */
export function TeamCarousel({ people }: { people: TeamMember[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLUListElement>(null);
  const state = useRef<MarqueeState>(initialState());
  const reduceMotion = useReducedMotion() ?? false;

  // Measure one copy of the list; keep the position proportional across resizes.
  useEffect(() => {
    const set = firstSetRef.current;
    if (!set) return;
    const measure = () => {
      const s = state.current;
      const previous = s.setWidth;
      s.setWidth = set.offsetWidth;
      s.x = previous ? (s.x / previous) * s.setWidth : -s.setWidth;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(set);
    return () => observer.disconnect();
  }, []);

  // Don't animate while the row is off-screen.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(([entry]) => {
      state.current.visible = entry.isIntersecting;
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // Sideways trackpad swipes move the row. Needs a non-passive listener to stop
  // the browser from treating the swipe as back/forward navigation.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const s = state.current;
      s.x -= e.deltaX;
      s.velocity = 0;
      s.lastInteraction = performance.now();
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useAnimationFrame((_, delta) => {
    const s = state.current;
    const track = trackRef.current;
    if (!track || !s.setWidth || !s.visible) return;

    if (!s.dragging) {
      const dt = Math.min(delta, 64) / 1000;
      const idle = performance.now() - s.lastInteraction > RESUME_AFTER_MS;
      const target = reduceMotion || s.hovering || s.focused || !idle ? 0 : SPEED_PX_S;
      s.speed += (target - s.speed) * (1 - Math.exp(-dt * 2.5));
      s.velocity *= Math.exp(-dt * 3.5);
      s.x += (s.speed + s.velocity) * dt;
    }
    s.x = wrap(s.x, s.setWidth);
    track.style.transform = `translate3d(${s.x.toFixed(2)}px, 0, 0)`;
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const s = state.current;
    s.pointerId = e.pointerId;
    s.startX = s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    s.startOffset = s.x;
    s.dragged = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    if (!s.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      // Capture only once it's a real drag, so plain clicks still reach the card links.
      s.dragging = s.dragged = true;
      s.speed = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - s.lastT);
    s.velocity = ((e.clientX - s.lastX) / dt) * 1000;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    s.x = s.startOffset + dx;
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (s.pointerId !== e.pointerId) return;
    s.pointerId = null;
    if (s.dragging) {
      s.dragging = false;
      s.lastInteraction = performance.now();
    } else {
      s.velocity = 0;
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const s = state.current;
    s.focused = true;
    const viewport = viewportRef.current;
    const card = (e.target as HTMLElement).closest("a");
    if (!viewport || !card) return;
    // The browser may scroll the clipped viewport to reveal the card; undo that and move the track instead.
    viewport.scrollLeft = 0;
    const bounds = viewport.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    if (rect.left < bounds.left + FOCUS_MARGIN_PX) s.x += bounds.left + FOCUS_MARGIN_PX - rect.left;
    else if (rect.right > bounds.right - FOCUS_MARGIN_PX) s.x -= rect.right - (bounds.right - FOCUS_MARGIN_PX);
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) state.current.focused = false;
  };

  const renderSet = (duplicate: boolean) =>
    people.map((person) => (
      <li key={person.id}>
        <TeamMemberCard person={person} duplicate={duplicate} />
      </li>
    ));

  return (
    <div className="relative [--card-gap:clamp(10px,1.29vw,28px)]">
      <LavaBand />
      <div
        ref={viewportRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Team Jukti"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") state.current.hovering = true;
        }}
        onPointerLeave={() => {
          state.current.hovering = false;
        }}
        onClickCapture={(e) => {
          if (!state.current.dragged) return;
          state.current.dragged = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => e.preventDefault()}
        onFocus={onFocus}
        onBlur={onBlur}
        className="relative cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          <ul ref={firstSetRef} className="flex gap-(--card-gap) pr-(--card-gap)">
            {renderSet(false)}
          </ul>
          <ul aria-hidden className="flex gap-(--card-gap) pr-(--card-gap)">
            {renderSet(true)}
          </ul>
        </div>
      </div>
    </div>
  );
}
