import Image from "next/image";
import { cn } from "@/lib/cn";

/* The university and department logos, as supplied (white artwork for the dark theme). */

export function IubLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/iub-logo.svg"
      alt="Independent University, Bangladesh"
      width={903}
      height={693}
      className={cn("h-auto", className)}
    />
  );
}

export function CseLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/cse-dept-logo.svg"
      alt="Department of Computer Science and Engineering, IUB"
      width={609}
      height={647}
      className={cn("h-auto", className)}
    />
  );
}
