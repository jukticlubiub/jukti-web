import { CameraIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Stands in for a photo the club will add later: a tinted panel with a camera, a note
 * saying what the photo should show, and a large faint label. Fills its (relative) parent.
 */
export function PhotoPlaceholder({
  hint,
  label,
  hue = 18,
  decorative = false,
  className,
}: {
  /** What the photo should show, e.g. "The founding committee, 2014". */
  hint: string;
  /** Large faint text behind, e.g. a year. */
  label?: string;
  /** Tint, as a colour-wheel angle (18 is the site's orange). */
  hue?: number;
  /** A second copy of the same placeholder: hidden from screen readers. */
  decorative?: boolean;
  className?: string;
}) {
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `Photo to come: ${hint}`}
      aria-hidden={decorative || undefined}
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 20% 10%, hsl(${hue} 80% 42%), transparent 60%), radial-gradient(90% 80% at 90% 100%, hsl(${hue + 50} 75% 32%), transparent 65%), hsl(${hue + 20} 55% 12%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {label && (
        <span
          aria-hidden
          className="absolute -right-[0.06em] -bottom-[0.18em] text-[clamp(5rem,12vw,10rem)] leading-none font-extralight tracking-[-0.06em] whitespace-nowrap text-white/15"
        >
          {label}
        </span>
      )}
      <div className="absolute inset-0 grid place-items-center p-6 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm">
            <CameraIcon className="size-5" />
          </span>
          <p className="mt-3 text-[0.72rem] font-medium tracking-[0.16em] text-white/75 uppercase">Photo to come</p>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[0.92rem] leading-snug text-white/90">{hint}</p>
        </div>
      </div>
    </div>
  );
}
