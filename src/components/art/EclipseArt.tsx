import { cn } from "@/lib/cn";

/** A stable pseudo-random number in [0, 1) for each (seed, slot). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (slot: number) => {
    let x = Math.imul(h ^ (slot * 0x9e3779b9), 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
}

/**
 * Cover art for anything without a picture: the homepage's eclipse (a dark planet
 * with a lava rim) seen through ribbed glass, composed differently for every seed,
 * with a short word etched into the sky like frosted glass. Fills its (relative) parent.
 */
export function EclipseArt({
  seed,
  glyph,
  animated = false,
  className,
}: {
  seed: string;
  /** A short word etched into the glass, e.g. "</>". */
  glyph?: string;
  /** Let the lava drift. Keep it for large, single covers. */
  animated?: boolean;
  className?: string;
}) {
  const r = seeded(seed);
  const x = 30 + r(1) * 40;
  const top = 58 + r(2) * 14;
  const width = 150 + r(3) * 70;
  const glyphRight = r(4) > 0.5;
  const blobs = [0, 1, 2].map((i) => ({
    x: x + (r(10 + i) - 0.5) * 70,
    size: 45 + r(20 + i) * 35,
    delay: -r(30 + i) * 20,
  }));

  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden bg-[#050201] [container-type:size]", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(95% 75% at ${x}% ${top + 6}%, #662a11 0%, #421b08 30%, #170a05 60%, #050201 100%)`,
        }}
      />
      {blobs.map((b, i) => (
        <span
          key={i}
          className={cn("lava-blob", !animated && "[animation:none]")}
          style={
            {
              "--x": `${b.x}%`,
              "--y": `${top + 2}%`,
              "--s": `${b.size}%`,
              "--c": i === 1 ? "rgb(245 124 72 / 0.55)" : "rgb(200 74 26 / 0.75)",
              "--d": `${22 + i * 5}s`,
              "--delay": `${b.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {glyph && (
        <span
          className={cn(
            "absolute top-[9cqh] font-display text-[30cqh] leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.16)]",
            glyphRight ? "right-[7cqw]" : "left-[7cqw]",
          )}
        >
          {glyph}
        </span>
      )}
      {/* The planet: its top edge is the eclipse's glowing rim. */}
      <div
        className="absolute aspect-square -translate-x-1/2 rounded-full"
        style={{
          left: `${x}%`,
          top: `${top}%`,
          width: `${width}%`,
          background: "radial-gradient(circle at 50% 0%, #1a0903 0%, #0b0401 22%, #000 55%)",
          boxShadow:
            "inset 0 1.5px 0 rgb(255 205 170 / 0.7), 0 0 0 1px rgb(245 124 72 / 0.4), 0 -4px 18px rgb(245 124 72 / 0.55), 0 -16px 70px 8px rgb(200 74 26 / 0.5)",
        }}
      />
      <div className="bg-ribs absolute inset-0 opacity-90" />
    </div>
  );
}
