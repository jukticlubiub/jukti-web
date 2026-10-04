"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, PinIcon } from "@/components/ui/icons";
import { useHasWebGL } from "@/components/ui/useHasWebGL";
import { useNow } from "@/components/ui/useNow";
import { cn } from "@/lib/cn";
import type { LatLng } from "./CampusMap";

// MapLibre is large, so it only loads once the map is about to scroll into view.
const CampusMap = dynamic(() => import("./CampusMap"), { ssr: false });

type Campus = LatLng & { name: string; address: readonly string[] };

const campusClock = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });

/** Straight-line distance in metres (haversine). */
function distanceMetres(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(m < 100000 ? 1 : 0)} km`;
}

/**
 * "Find Us": a live, themed map of the campus with an info panel floating over it
 * (address, directions, campus time, and how far away you are).
 */
export function CampusMapSection({ campus }: { campus: Campus }) {
  const section = useRef<HTMLDivElement>(null);
  const webgl = useHasWebGL();
  const reduceMotion = useReducedMotion() ?? false;
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [you, setYou] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const nearby = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    const visible = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
    nearby.observe(el);
    visible.observe(el);
    return () => {
      nearby.disconnect();
      visible.disconnect();
    };
  }, []);

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocateError("Your browser can't share its location.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setYou({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      (error) => {
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? "Location access was blocked. You can allow it in your browser's site settings."
            : "We couldn't find your location. Please try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }

  const query = encodeURIComponent(campus.name);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${campus.lat},${campus.lng}`;
  const placeUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const distance = you ? distanceMetres(you, campus) : null;

  return (
    <div ref={section} className="glass-card relative p-2.5">
      <div className="relative h-[clamp(26rem,62svh,42rem)] overflow-hidden rounded-[14px] bg-[#070403] lg:h-[clamp(34rem,72svh,46rem)]">
        <MapStandIn hidden={mapReady} />
        {webgl && near && (
          <div className={cn("absolute inset-0 transition-opacity duration-1000 ease-reveal", mapReady ? "opacity-100" : "opacity-0")}>
            <CampusMap campus={campus} active={onScreen} animate={!reduceMotion} you={you} onLoad={() => setMapReady(true)} />
          </div>
        )}
        {/* Ribbed glass and a vignette over the map, as over the rest of the site. */}
        <div aria-hidden className="bg-ribs pointer-events-none absolute inset-0 opacity-40" />
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_40px_rgb(0_0_0/0.75)]" />
        <CampusClock className="absolute top-4 right-4" />
      </div>

      {/* Over the map on large screens, below it on small ones. */}
      <div className="relative mt-2.5 rounded-[14px] border border-glass-border bg-[rgb(12_7_5/0.72)] p-6 backdrop-blur-xl sm:p-7 lg:absolute lg:top-7 lg:bottom-7 lg:left-7 lg:mt-0 lg:flex lg:w-[24rem] lg:flex-col">
        <p className="text-[0.75rem] font-medium tracking-[0.18em] text-flare uppercase">Where we meet</p>
        <h3 className="mt-3 font-heading text-[clamp(1.25rem,1.6vw,1.55rem)] leading-[1.2]">{campus.name}</h3>
        <address className="mt-5 flex gap-3 text-[1rem] leading-relaxed text-body not-italic">
          <PinIcon className="mt-1 text-flare" />
          <span>
            {campus.address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        </address>

        <div className="mt-7 grid gap-2.5">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-pill btn-primary">
            Get directions
            <ArrowIcon />
          </a>
          <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="btn-pill btn-ghost text-[0.85rem]">
            Open in Google Maps
          </a>
        </div>

        <div className="mt-7 border-t border-glass-border pt-6 lg:mt-auto">
          {distance !== null ? (
            <p className="text-[1rem] text-body" role="status">
              You’re <span className="font-display text-[1.15rem] text-fg">{formatDistance(distance)}</span> from campus, as the crow flies.
            </p>
          ) : (
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="inline-flex items-center gap-2.5 text-[0.95rem] text-fg transition-colors hover:text-flare disabled:opacity-70"
            >
              <span aria-hidden className="relative grid size-8 place-items-center rounded-full border border-glass-border">
                <span className={cn("size-2 rounded-full bg-flare", locating && "animate-ping")} />
              </span>
              {locating ? "Finding you…" : "How far am I from campus?"}
            </button>
          )}
          {locateError && (
            <p role="alert" className="mt-3 text-[0.9rem] text-[#ff8f7a]">
              {locateError}
            </p>
          )}
          <p className="mt-3 text-[0.8rem] text-muted">Your location stays in your browser.</p>
        </div>
      </div>
    </div>
  );
}

/** "Live" and the time on campus, ticking. */
function CampusClock({ className }: { className?: string }) {
  const now = useNow();
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-glass-border bg-black/60 py-2 pr-4 pl-3 text-[0.8rem] text-body backdrop-blur-md",
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-flare opacity-75" />
        <span className="relative size-2 rounded-full bg-flare" />
      </span>
      <span className="font-medium tracking-[0.14em] text-fg uppercase">Live</span>
      <span aria-hidden className="h-3 w-px bg-white/20" />
      <span className={cn("tabular-nums", now === null && "invisible")}>
        Campus time {now === null ? "0:00 AM" : campusClock.format(now).replace(/\s/g, " ")}
      </span>
    </div>
  );
}

/** Shown while the map loads, and instead of it where WebGL isn't available. */
function MapStandIn({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 grid place-items-center transition-opacity duration-1000",
        "bg-[radial-gradient(60%_60%_at_60%_50%,rgb(102_42_17/0.35),transparent),linear-gradient(90deg,rgb(245_124_72/0.06)_1px,transparent_1px),linear-gradient(rgb(245_124_72/0.06)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]",
        hidden && "opacity-0",
      )}
    >
      <span className="relative grid size-12 place-items-center lg:translate-x-[12rem]">
        <span className="absolute inset-0 animate-ping rounded-full bg-flare/35" />
        <span className="size-4 rounded-full bg-flare shadow-[0_0_24px_rgb(245_124_72/0.8)]" />
      </span>
    </div>
  );
}
