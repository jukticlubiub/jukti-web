import Image, { getImageProps } from "next/image";
import { cn } from "@/lib/cn";
import type { JuktiEvent } from "@/lib/events/types";
import { EventArt } from "./EventArt";

/** Where a square frame takes over from the wide one (matches the layouts' lg breakpoint). */
const LARGE_SCREEN = "(min-width: 1024px)";

/**
 * One cover image. With `squareSrc`, it's a <picture>: large screens get the square image, others the
 * wide one, and the browser downloads only the one it shows (Next's art direction, via getImageProps).
 */
function CoverImg({
  src,
  squareSrc,
  alt,
  sizes,
  priority,
  fill,
  className,
  decorative,
}: {
  src: string;
  squareSrc: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  fill?: boolean;
  className?: string;
  /** A background copy: hidden from screen readers. */
  decorative?: boolean;
}) {
  // Natural mode: width/height only reserve space until it loads; h-auto then follows the real shape.
  const dims = (square: boolean) => (fill ? { fill: true as const } : square ? { width: 1400, height: 1400 } : { width: 1600, height: 900 });
  if (!squareSrc) {
    return <Image src={src} alt={decorative ? "" : alt} aria-hidden={decorative || undefined} sizes={sizes} priority={priority} {...dims(false)} className={className} />;
  }
  const {
    props: { srcSet: squareSet },
  } = getImageProps({ src: squareSrc, alt, sizes, ...dims(true) });
  const { props } = getImageProps({ src, alt: decorative ? "" : alt, sizes, priority, ...dims(false) });
  return (
    <picture>
      <source media={LARGE_SCREEN} srcSet={squareSet} sizes={props.sizes} />
      <img {...props} alt={decorative ? "" : alt} aria-hidden={decorative || undefined} className={className} />
    </picture>
  );
}

/**
 * The event's poster, or cover art drawn in the site's style when there isn't one. Fills its parent,
 * or with `natural` shows the poster uncropped at its own shape (posters come in any shape).
 * With `squareOnLarge`, large screens use the square (1:1) cover when the event has one.
 */
export function EventCover({
  event,
  sizes,
  animated,
  priority,
  natural,
  contain,
  squareOnLarge,
  className,
}: {
  event: Pick<JuktiEvent, "slug" | "category" | "cover">;
  sizes: string;
  animated?: boolean;
  priority?: boolean;
  natural?: boolean;
  /** Fill the parent without cropping: the whole poster, with a blurred copy of it filling the space around. */
  contain?: boolean;
  /** This frame is square-ish on large screens: use the square cover there, if there is one. */
  squareOnLarge?: boolean;
  className?: string;
}) {
  const cover = event.cover;
  if (!cover) return <EventArt category={event.category} seed={event.slug} animated={animated} className={className} />;

  const squareSrc = squareOnLarge && cover.squareUrl && cover.squareUrl !== cover.url ? cover.squareUrl : null;
  const common = { src: cover.url, squareSrc, alt: cover.alt, sizes };

  if (contain) {
    return (
      <>
        <CoverImg {...common} fill decorative className={cn("object-cover", className, "scale-110 opacity-45 blur-2xl")} />
        <CoverImg {...common} fill priority={priority} className={cn("object-contain", className)} />
      </>
    );
  }
  if (natural) return <CoverImg {...common} priority={priority} className={cn("block h-auto w-full", className)} />;
  return <CoverImg {...common} fill priority={priority} className={cn("object-cover", className)} />;
}
