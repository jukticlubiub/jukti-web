import { cn } from "@/lib/cn";

const block = "rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse";

/** Shown for a moment while the event list is put together. */
export function EventsBoardSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-[92rem] px-5 pt-[clamp(3rem,5vw,6rem)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className={cn(block, "h-[36rem]")} />
      <div className="mt-24 grid gap-5">
        <div className={cn(block, "h-40")} />
        <div className={cn(block, "h-40")} />
      </div>
    </div>
  );
}

export function RsvpSkeleton() {
  return (
    <div aria-hidden className={cn(block, "h-[26rem]")}>
      <span className="sr-only">Loading RSVP</span>
    </div>
  );
}

export function EventDetailSkeleton() {
  return (
    <div aria-hidden className="mx-auto grid max-w-[92rem] gap-10 px-5 pt-[clamp(9rem,13vw,13rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className="space-y-6">
        <div className={cn(block, "h-8 w-40 rounded-full")} />
        <div className={cn(block, "h-40")} />
        <div className={cn(block, "h-24")} />
      </div>
      <div className={cn(block, "aspect-[4/5]")} />
    </div>
  );
}
