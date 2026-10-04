import { cn } from "@/lib/cn";

/** Stand-in bust until a portrait is added. Sits at the bottom of its (relative) frame. */
export function Silhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      aria-hidden
      className={cn("absolute inset-x-[10%] bottom-0 w-[80%]", className)}
      fill="currentColor"
    >
      <circle cx="100" cy="72" r="42" />
      <path d="M20 220c0-52 36-86 80-86s80 34 80 86z" />
    </svg>
  );
}
