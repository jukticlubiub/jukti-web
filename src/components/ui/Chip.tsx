import { cn } from "@/lib/cn";

export const chipClass =
  "inline-flex h-8 items-center gap-2 rounded-full border px-3.5 text-[0.8rem] font-medium tracking-[0.06em] uppercase whitespace-nowrap";

/** A small outlined label, e.g. an event's or a log's category. */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(chipClass, "border-flare/35 text-flare", className)}>{children}</span>;
}
