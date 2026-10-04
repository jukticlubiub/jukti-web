import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

/*
 * The Contact page map, drawn in the site's palette: near-black land, streets as
 * embers that get hotter (and glow) the bigger the road, campuses outlined in lava,
 * and 3D buildings lit from within. Vector tiles and fonts come from OpenFreeMap
 * (free, no API key; OpenMapTiles schema, OpenStreetMap data).
 */

const SOURCE = "openmaptiles";

// Street names are often in Bengali only; the map font covers Latin, so prefer English.
const label: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

const notTunnel: ExpressionSpecification = ["!=", ["get", "brunnel"], "tunnel"];

/** Line width that grows with zoom, from `min` at z12 to `max` at z20. */
const width = (min: number, max: number): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  12,
  min,
  20,
  max,
];

const roadClass = (...classes: string[]): ExpressionSpecification => [
  "all",
  notTunnel,
  ["match", ["get", "class"], classes, true, false],
];

export const emberMapStyle: StyleSpecification = {
  version: 8,
  name: "JUKTI Ember",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    [SOURCE]: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#070403" } },
    {
      id: "residential",
      type: "fill",
      source: SOURCE,
      "source-layer": "landuse",
      filter: ["==", ["get", "class"], "residential"],
      paint: { "fill-color": "#0a0504" },
    },
    {
      id: "green",
      type: "fill",
      source: SOURCE,
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["grass", "wood", "farmland", "wetland"], true, false],
      paint: { "fill-color": "#0c0906" },
    },
    { id: "park", type: "fill", source: SOURCE, "source-layer": "park", paint: { "fill-color": "#0c0906" } },
    {
      id: "campus",
      type: "fill",
      source: SOURCE,
      "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["university", "college", "school"], true, false],
      paint: { "fill-color": "#1a0b05" },
    },
    {
      id: "campus-outline",
      type: "line",
      source: SOURCE,
      "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["university", "college"], true, false],
      paint: { "line-color": "#662a11", "line-width": width(0.6, 2), "line-dasharray": [3, 2] },
    },
    { id: "water", type: "fill", source: SOURCE, "source-layer": "water", filter: notTunnel, paint: { "fill-color": "#030506" } },
    {
      id: "waterway",
      type: "line",
      source: SOURCE,
      "source-layer": "waterway",
      paint: { "line-color": "#060a0c", "line-width": width(0.5, 4) },
    },
    {
      id: "path",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      minzoom: 14,
      filter: roadClass("path", "pedestrian", "track"),
      paint: { "line-color": "#2a150b", "line-width": width(0.4, 2), "line-dasharray": [2, 2] },
    },
    {
      id: "rail",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("rail", "transit"),
      paint: { "line-color": "#2b1a12", "line-width": width(0.6, 2.5), "line-dasharray": [4, 3] },
    },
    {
      id: "road-minor",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("minor", "service"),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2c1409", "line-width": width(0.5, 12) },
    },
    {
      id: "road-medium",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("secondary", "tertiary"),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#4a200c", "line-width": width(1, 18) },
    },
    // A soft glow under the main roads, like lava in a crack.
    {
      id: "road-major-glow",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("primary", "trunk", "motorway"),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#c84a1a", "line-width": width(6, 44), "line-blur": width(4, 26), "line-opacity": 0.35 },
    },
    {
      id: "road-major",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("primary", "trunk"),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#8a3510", "line-width": width(1.4, 22) },
    },
    {
      id: "road-motorway",
      type: "line",
      source: SOURCE,
      "source-layer": "transportation",
      filter: roadClass("motorway"),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#c84a1a", "line-width": width(1.6, 24) },
    },
    {
      id: "buildings",
      type: "fill-extrusion",
      source: SOURCE,
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0], 0, "#140a06", 40, "#2a130a"],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.9,
      },
    },
    {
      id: "road-names",
      type: "symbol",
      source: SOURCE,
      "source-layer": "transportation_name",
      minzoom: 14,
      layout: {
        "symbol-placement": "line",
        "text-field": label,
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, 13],
      },
      paint: { "text-color": "#8f847d", "text-halo-color": "#070403", "text-halo-width": 1.4 },
    },
    {
      id: "water-names",
      type: "symbol",
      source: SOURCE,
      "source-layer": "water_name",
      layout: { "text-field": label, "text-font": ["Noto Sans Italic"], "text-size": 12 },
      paint: { "text-color": "#4f5b60", "text-halo-color": "#030506", "text-halo-width": 1.2 },
    },
    {
      id: "place-names",
      type: "symbol",
      source: SOURCE,
      "source-layer": "place",
      filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter", "town", "city"], true, false],
      layout: {
        "text-field": label,
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 16, 14],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.14,
        "text-max-width": 8,
      },
      paint: { "text-color": "#b3a79f", "text-halo-color": "#070403", "text-halo-width": 1.6 },
    },
  ],
};
