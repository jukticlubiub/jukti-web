import Image from "next/image";
import { cn } from "@/lib/cn";
import type { JuktiEvent } from "@/lib/events/types";
import { EventArt } from "./EventArt";

/**
 * The event's poster, or cover art drawn in the site's style when there isn't one. Fills its parent,
 * or with `natural` shows the poster uncropped at its own shape (posters come in any shape).
 */
export function EventCover({
  event,
  sizes,
  animated,
  priority,
  natural,
  className,
}: {
  event: Pick<JuktiEvent, "slug" | "category" | "cover">;
  sizes: string;
  animated?: boolean;
  priority?: boolean;
  natural?: boolean;
  className?: string;
}) {
  if (event.cover && natural) {
    // The width/height only reserve space until it loads; h-auto then follows the image's real shape.
    return (
      <Image
        src={event.cover.url}
        alt={event.cover.alt}
        width={1600}
        height={1000}
        sizes={sizes}
        priority={priority}
        className={cn("block h-auto w-full", className)}
      />
    );
  }
  if (event.cover) {
    return (
      <Image
        src={event.cover.url}
        alt={event.cover.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }
  return <EventArt category={event.category} seed={event.slug} animated={animated} className={className} />;
}
