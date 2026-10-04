import { cn } from "@/lib/cn";
import { type HelplineRole, helplineRoleLabels } from "@/lib/helpline/types";

/** Faculty on lava; seniors outlined in flare; the club itself outlined in grey. */
export function RoleBadge({ role, className }: { role: HelplineRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[0.7rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase",
        role === "faculty" && "bg-lava text-white shadow-[0_0_18px_-4px_rgb(245_124_72/0.8)]",
        role === "senior" && "border border-flare/50 text-flare",
        role === "editor" && "border border-glass-border text-body",
        className,
      )}
    >
      {helplineRoleLabels[role]}
    </span>
  );
}
