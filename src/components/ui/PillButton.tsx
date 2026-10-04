import Link from "next/link";
import { cn } from "@/lib/cn";

type PillButtonProps = {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

export function PillButton({ href, variant = "primary", className, children }: PillButtonProps) {
  return (
    <Link href={href} className={cn("btn-pill", variant === "primary" ? "btn-primary" : "btn-ghost", className)}>
      {children}
    </Link>
  );
}
