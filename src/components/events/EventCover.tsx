import Image from "next/image";
import { cn } from "@/lib/cn";
import type { JuktiEvent } from "@/lib/events/types";
import { EventArt } from "./EventArt";

/** The event's poster, or cover art drawn in the site's style when there isn't one. Fills its parent. */
export function EventCover({
  event,
  sizes,
  animated,
  priority,
  className,
}: {
  event: Pick<JuktiEvent, "slug" | "category" | "cover">;
  sizes: string;
  animated?: boolean;
  priority?: boolean;
  className?: string;
}) {
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
