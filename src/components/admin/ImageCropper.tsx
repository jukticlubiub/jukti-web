"use client";

/* eslint-disable @next/next/no-img-element -- the image being cropped is a local file */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CropShape, ImagePreset } from "@/lib/admin/image-presets";
import { cn } from "@/lib/cn";

export type Cropped = { blob: Blob; width: number; height: number };

const STAGE_MAX_W = 560;
const STAGE_MAX_H = 440;
const MAX_ZOOM = 4;

type View = { zoom: number; x: number; y: number };

/**
 * Frame a photo for the card it will appear in: the frame has the card's shape, the photo
 * is dragged to position and zoomed to size, and it's saved at the size that card needs.
 * Zooming out below "fill" leaves room around the photo (transparent for cut-out
 * portraits, the site's black otherwise).
 */
export function ImageCropper({
  file,
  preset,
  onCancel,
  onDone,
}: {
  file: Blob;
  preset: ImagePreset;
  onCancel: () => void;
  onDone: (result: Cropped) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [shape, setShape] = useState<CropShape>(preset.shapes[0]);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ id: number; startX: number; startY: number; from: View } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: STAGE_MAX_W, h: STAGE_MAX_H });

  // On small screens the frame shrinks to the space there is.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () =>
      setRoom({
        w: Math.min(STAGE_MAX_W, el.clientWidth - 24),
        h: Math.min(STAGE_MAX_H, Math.max(220, window.innerHeight * 0.48)),
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The URL is made and revoked by the same effect, so a re-run (Strict Mode) can't revoke it early.
  useEffect(() => {
    const src = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg(el);
    el.onerror = () => setFailed(true);
    el.src = src;
    return () => {
      el.onload = el.onerror = null;
      URL.revokeObjectURL(src);
    };
  }, [file]);

  // The frame on screen, in CSS px: the card's shape, as large as fits.
  const aspect = shape.aspect ?? (img ? img.naturalWidth / img.naturalHeight : 1);
  const frame = useMemo(() => {
    let w = room.w;
    let h = w / aspect;
    if (h > room.h) {
      h = room.h;
      w = h * aspect;
    }
    return { w, h };
  }, [aspect, room]);

  // At zoom 1 the photo exactly covers the frame.
  const cover = img ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight) : 1;
  const contain = img ? Math.min(frame.w / img.naturalWidth, frame.h / img.naturalHeight) : 1;
  const minZoom = Math.min(1, contain / cover);
  const scale = cover * view.zoom;
  const shownW = (img?.naturalWidth ?? 0) * scale;
  const shownH = (img?.naturalHeight ?? 0) * scale;

  /** Keep the photo over the frame (or centred, on an axis where it's smaller than the frame). */
  const clamp = useCallback(
    (v: View): View => {
      if (!img) return v;
      const s = cover * v.zoom;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      const limit = (pos: number, size: number, box: number) => (size <= box ? (box - size) / 2 : Math.min(0, Math.max(box - size, pos)));
      return { zoom: v.zoom, x: limit(v.x, w, frame.w), y: limit(v.y, h, frame.h) };
    },
    [img, cover, frame],
  );

  /** Zoom around a point of the frame (its centre by default). */
  const zoomTo = useCallback(
    (zoom: number, at?: { x: number; y: number }) => {
      setView((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(minZoom, zoom));
        const px = at?.x ?? frame.w / 2;
        const py = at?.y ?? frame.h / 2;
        const k = z / v.zoom;
        return clamp({ zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    },
    [minZoom, frame, clamp],
  );

  // Start filled and centred, again whenever the shape changes.
  useEffect(() => {
    if (!img) return;
    // Resetting the framing for a new photo or shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(clamp({ zoom: 1, x: (frame.w - img.naturalWidth * cover) / 2, y: (frame.h - img.naturalHeight * cover) / 2 }));
  }, [img, frame, cover, clamp]);

  // Escape closes; focus starts in the dialog.
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: view };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setView(clamp({ zoom: d.from.zoom, x: d.from.x + e.clientX - d.startX, y: d.from.y + e.clientY - d.startY }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    zoomTo(view.zoom * Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setView((v) => clamp({ ...v, x: v.x + moves[e.key][0], y: v.y + moves[e.key][1] }));
    } else if (e.key === "+" || e.key === "=") zoomTo(view.zoom * 1.1);
    else if (e.key === "-") zoomTo(view.zoom / 1.1);
  };

  // Saved size: the shape's size, but never larger than the photo really has pixels for.
  const output = useMemo(() => {
    if (!img) return null;
    if (shape.aspect === null) {
      const k = Math.min(1, shape.width / Math.max(img.naturalWidth, img.naturalHeight));
      return { w: Math.round(img.naturalWidth * k), h: Math.round(img.naturalHeight * k), upscaled: false };
    }
    const sourceW = frame.w / scale; // photo pixels across the frame
    const w = Math.round(Math.min(shape.width, Math.max(sourceW, 1)));
    return { w, h: Math.round(w / shape.aspect), upscaled: sourceW < shape.width * 0.6 };
  }, [img, shape, frame, scale]);

  const save = async () => {
    if (!img || !output) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = output.w;
    canvas.height = output.h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    if (!preset.transparent) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, output.w, output.h);
    }
    if (shape.aspect === null) {
      ctx.drawImage(img, 0, 0, output.w, output.h);
    } else {
      const k = output.w / frame.w;
      ctx.drawImage(img, view.x * k, view.y * k, shownW * k, shownH * k);
    }
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onDone({ blob, width: output.w, height: output.h });
      },
      "image/webp",
      0.88,
    );
  };

  const free = shape.aspect === null;

  return (
    <div className="fixed inset-0 z-[60] grid grid-cols-1 place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Crop the image"
        tabIndex={-1}
        className="w-full max-w-[640px] rounded-[20px] border border-glass-border bg-[#110e0c] p-5 shadow-2xl outline-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.15rem] text-fg">Frame the image</h2>
            <p className="mt-1 text-[0.85rem] leading-snug text-muted">Used for {preset.usedFor}.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-9 shrink-0 place-items-center rounded-full border border-glass-border text-body hover:text-fg">
            ✕
          </button>
        </div>

        {preset.shapes.length > 1 && (
          <div role="group" aria-label="Shape" className="mt-4 flex flex-wrap gap-2">
            {preset.shapes.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-pressed={s === shape}
                onClick={() => setShape(s)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[0.8rem] transition-colors",
                  s === shape ? "border-flare bg-lava text-white" : "border-glass-border text-body hover:border-flare/50",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* The stage: the frame is the card; drag the photo inside it. */}
        <div ref={stage} className="mt-4 grid place-items-center rounded-[14px] bg-[repeating-conic-gradient(#1b1715_0_25%,#141110_0_50%)] bg-[length:18px_18px] p-3">
          <div
            role="application"
            aria-label="Drag or use the arrow keys to position the photo; + and − to zoom"
            tabIndex={free ? -1 : 0}
            onPointerDown={free ? undefined : onPointerDown}
            onPointerMove={free ? undefined : onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={free ? undefined : onWheel}
            onKeyDown={free ? undefined : onKeyDown}
            className={cn(
              "relative touch-none overflow-hidden outline-flare focus-visible:outline-2",
              !free && "cursor-grab active:cursor-grabbing",
              preset.round ? "rounded-full" : "rounded-[6px]",
              !preset.transparent && "bg-black",
            )}
            style={{ width: frame.w, height: frame.h }}
          >
            {img && (
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
                style={free ? { width: "100%", height: "100%" } : { width: shownW, height: shownH, transform: `translate(${view.x}px, ${view.y}px)` }}
              />
            )}
            {/* Rule-of-thirds guides */}
            {!free && (
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                <div className={cn("absolute inset-0 ring-2 ring-flare/70 ring-inset", preset.round ? "rounded-full" : "rounded-[6px]")} />
              </div>
            )}
          </div>
        </div>

        {!free && (
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => zoomTo(view.zoom / 1.2)} aria-label="Zoom out" className="grid size-8 shrink-0 place-items-center rounded-full border border-glass-border text-body hover:text-fg">
              −
            </button>
            <input
              type="range"
              aria-label="Zoom"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={view.zoom}
              onChange={(e) => zoomTo(Number(e.target.value))}
              className="flex-1 accent-[#f57c48]"
            />
            <button type="button" onClick={() => zoomTo(view.zoom * 1.2)} aria-label="Zoom in" className="grid size-8 shrink-0 place-items-center rounded-full border border-glass-border text-body hover:text-fg">
              +
            </button>
            <button type="button" onClick={() => zoomTo(1)} className="h-8 shrink-0 rounded-full border border-glass-border px-3 text-[0.78rem] text-body hover:text-fg">
              Fill
            </button>
            {minZoom < 1 && (
              <button type="button" onClick={() => zoomTo(minZoom)} className="h-8 shrink-0 rounded-full border border-glass-border px-3 text-[0.78rem] text-body hover:text-fg">
                Fit whole
              </button>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.82rem] text-muted">
            {output ? (
              <>
                Saved as {output.w} × {output.h} px{preset.transparent ? ", keeping transparency" : ""}.
                {output.upscaled && <span className="block text-[#ffb4a6]">This photo is small for this card and may look soft. Use a larger one if you can.</span>}
              </>
            ) : failed ? (
              <span className="text-[#ffb4a6]">This file couldn’t be opened as an image. Try a JPG, PNG or WebP.</span>
            ) : (
              "Loading…"
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="btn-pill btn-ghost h-10 px-4 text-[0.78rem]">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={!img || busy} className="btn-pill btn-primary h-10 px-5 text-[0.78rem] disabled:opacity-60">
              {busy ? "Saving…" : "Use this crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
