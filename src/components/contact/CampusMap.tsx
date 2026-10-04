"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogoMark } from "@/components/brand/Logo";
import { emberMapStyle } from "./map-style";

export type LatLng = { lat: number; lng: number };

/** The close-up the map settles on: campus in the middle, tilted to show the buildings. */
const CLOSE_UP = { zoom: 16.3, pitch: 55, bearing: -22 };
/** Where the fly-in starts: most of Dhaka. */
const WIDE = { zoom: 11.6, pitch: 0, bearing: 0 };
/** Room for the info panel that sits over the map's left side on large screens. */
const PANEL_INSET_PX = 430;

const ROUTE_SOURCE = "you-to-campus";

// Served from public/ (see scripts/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

function flyToCampus(map: maplibregl.Map, campus: LatLng, animate: boolean) {
  map.flyTo({ center: [campus.lng, campus.lat], ...CLOSE_UP, duration: animate ? 3200 : 0, essential: false });
}

function showRoute(map: maplibregl.Map, from: LatLng, to: LatLng) {
  const data: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
  };
  const source = map.getSource<maplibregl.GeoJSONSource>(ROUTE_SOURCE);
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(ROUTE_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: ROUTE_SOURCE,
    type: "line",
    source: ROUTE_SOURCE,
    layout: { "line-cap": "round" },
    paint: { "line-color": "#f57c48", "line-width": 2.5, "line-dasharray": [1.5, 2] },
  });
}

/**
 * The live map of the campus (MapLibre, drawn in the site's ember style). Pinned on
 * IUB; flies in from a view of the city the first time it's on screen. Shows the
 * visitor too, with a line to campus, once they ask for it.
 */
export default function CampusMap({
  campus,
  active,
  animate,
  you,
  onLoad,
}: {
  campus: LatLng;
  /** On screen: the fly-in waits for this. */
  active: boolean;
  animate: boolean;
  you: LatLng | null;
  onLoad: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);
  const flown = useRef(false);
  const activeRef = useRef(active);
  const onLoadRef = useRef(onLoad);
  // The pins are React content rendered (through portals) into elements the map positions.
  const [campusPin] = useState(() => document.createElement("div"));
  const [youPin] = useState(() => document.createElement("div"));

  useEffect(() => {
    activeRef.current = active;
    onLoadRef.current = onLoad;
  });

  useEffect(() => {
    if (!container.current) return;
    const wide = animate;
    const m = new maplibregl.Map({
      container: container.current,
      style: emberMapStyle,
      center: [campus.lng, campus.lat],
      ...(wide ? WIDE : CLOSE_UP),
      cooperativeGestures: true,
      attributionControl: { compact: true },
      maxPitch: 70,
      fadeDuration: 0,
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    new maplibregl.Marker({ element: campusPin, anchor: "bottom" }).setLngLat([campus.lng, campus.lat]).addTo(m);

    // Keep the campus clear of the info panel on large screens.
    const wideScreen = window.matchMedia("(min-width: 1024px)");
    const inset = () => m.setPadding({ top: 0, right: 0, bottom: 0, left: wideScreen.matches ? PANEL_INSET_PX : 0 });
    inset();
    wideScreen.addEventListener("change", inset);

    m.on("load", () => {
      loaded.current = true;
      onLoadRef.current();
      if (activeRef.current && !flown.current) {
        flown.current = true;
        flyToCampus(m, campus, wide);
      }
    });
    map.current = m;

    return () => {
      wideScreen.removeEventListener("change", inset);
      m.remove();
      map.current = null;
      loaded.current = false;
    };
  }, [campus, animate, campusPin]);

  // The first time the map scrolls into view, fly in.
  useEffect(() => {
    const m = map.current;
    if (!active || !m || !loaded.current || flown.current) return;
    flown.current = true;
    flyToCampus(m, campus, animate);
  }, [active, campus, animate]);

  // The visitor's position: a pin, a dashed line to campus, and a view that fits both.
  useEffect(() => {
    const m = map.current;
    if (!m || !you) return;
    flown.current = true;
    const pin = new maplibregl.Marker({ element: youPin, anchor: "top", offset: [0, -10] }).setLngLat([you.lng, you.lat]).addTo(m);
    const draw = () => {
      showRoute(m, you, campus);
      m.fitBounds(
        [
          [Math.min(you.lng, campus.lng), Math.min(you.lat, campus.lat)],
          [Math.max(you.lng, campus.lng), Math.max(you.lat, campus.lat)],
        ],
        // Extra room on top for the campus pin and its label, which stand above the point.
        { padding: { top: 150, bottom: 70, left: 70, right: 70 }, pitch: 30, bearing: 0, maxZoom: 16, duration: animate ? 2200 : 0 },
      );
    };
    if (loaded.current) draw();
    else m.once("load", draw);
    return () => {
      pin.remove();
      if (m.getLayer(ROUTE_SOURCE)) m.removeLayer(ROUTE_SOURCE);
      if (m.getSource(ROUTE_SOURCE)) m.removeSource(ROUTE_SOURCE);
    };
  }, [you, campus, animate, youPin]);

  return (
    <>
      {/* MapLibre's own CSS makes the map element position: relative, so it fills a positioned wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="campus-map size-full" />
      </div>
      {createPortal(<CampusPin />, campusPin)}
      {createPortal(<YouPin />, youPin)}
    </>
  );
}

function CampusPin() {
  return (
    <div className="pointer-events-none flex flex-col items-center">
      <div className="mb-2.5 rounded-full border border-flare/50 bg-black/75 px-3.5 py-1.5 font-display text-[0.68rem] tracking-[0.08em] whitespace-nowrap text-fg shadow-[0_8px_30px_-6px_rgb(245_124_72/0.6)] backdrop-blur-md">
        JUKTI @ IUB
      </div>
      <span className="relative grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-flare/35 [animation-duration:2.2s]" />
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f57c48,#c84a1a_55%,#662a11)] shadow-[0_0_34px_6px_rgb(245_124_72/0.65)]" />
        <LogoMark className="relative w-6 text-white" title="" />
      </span>
      <span className="h-5 w-px bg-[linear-gradient(to_bottom,#f57c48,transparent)]" />
      <span className="size-1.5 rounded-full bg-flare shadow-[0_0_10px_rgb(245_124_72)]" />
    </div>
  );
}

function YouPin() {
  return (
    <div className="pointer-events-none flex flex-col items-center">
      <span className="relative grid size-5 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
        <span className="size-3.5 rounded-full border-[3px] border-black bg-white shadow-[0_0_0_2px_rgb(255_255_255/0.9),0_0_16px_rgb(255_255_255/0.8)]" />
      </span>
      <span className="mt-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[0.7rem] font-medium tracking-[0.1em] text-fg uppercase backdrop-blur-md">
        You
      </span>
    </div>
  );
}
