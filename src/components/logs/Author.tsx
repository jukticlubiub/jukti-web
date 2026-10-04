import Image from "next/image";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import type { LogAuthor } from "@/lib/logs/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/** The author's photo; the JUKTI mark for club teams; otherwise their initials on lava. */
export function AuthorAvatar({ author, className }: { author: LogAuthor; className?: string }) {
  const base = cn("relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full", className);
  if (author.avatarUrl) {
    return (
      <span className={base}>
        <Image src={author.avatarUrl} alt="" fill sizes="64px" className="object-cover" />
      </span>
    );
  }
  if (/^jukti\b/i.test(author.name)) {
    return (
      <span aria-hidden className={cn(base, "border border-glass-border bg-[radial-gradient(circle_at_30%_20%,#2a120a,#0b0401)] text-fg")}>
        <LogoMark className="w-[58%]" title="" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(base, "bg-[radial-gradient(90%_90%_at_50%_30%,#c84a1a_40%,#7a2e0e)] text-[0.8em] font-medium text-white")}
    >
      {initials(author.name)}
    </span>
  );
}

/** Avatar, name and (below) date and reading time. */
export function AuthorLine({
  author,
  meta,
  className,
}: {
  author: LogAuthor;
  meta: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AuthorAvatar author={author} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-normal text-fg">{author.name}</p>
        <p className="mt-1 truncate text-[0.88rem] text-muted">{meta}</p>
      </div>
    </div>
  );
}
