import Link from "next/link";
import { cn } from "@/lib/cn";

/** Building blocks for admin pages, in the site's glass and lava style. */

export function PageHeader({
  title,
  description,
  children,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-[0.88rem] text-muted transition-colors hover:text-fg">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-tight font-light tracking-[-0.03em] text-fg">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-[18px] border border-glass-border bg-white/[0.025] p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[1.05rem] font-normal text-fg">{title}</h2>}
            {description && <p className="mt-1 text-[0.88rem] leading-relaxed text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const pillTones = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  orange: "border-flare/40 bg-lava/15 text-flare",
  grey: "border-glass-border bg-white/[0.04] text-muted",
  red: "border-[#ff8f7a]/40 bg-[#ff8f7a]/10 text-[#ffb4a6]",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
} as const;

export function Pill({ tone = "grey", children, className }: { tone?: keyof typeof pillTones; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[0.72rem] font-medium tracking-[0.04em] whitespace-nowrap", pillTones[tone], className)}>
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-dashed border-glass-border px-6 py-12 text-center">
      <p className="text-[1.05rem] text-fg">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-[0.92rem] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "orange" }) {
  const body = (
    <>
      <p className="text-[0.8rem] tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className={cn("mt-2 text-[2rem] leading-none font-extralight tracking-[-0.04em]", tone === "orange" ? "text-flare" : "text-fg")}>{value}</p>
      {hint && <p className="mt-2 text-[0.85rem] text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-[18px] border border-glass-border bg-white/[0.025] p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-flare/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A responsive table: rows become cards on phones. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-glass-border">
      <table className="w-full text-left text-[0.92rem]">
        <thead className="hidden bg-white/[0.03] text-[0.75rem] tracking-[0.08em] text-muted uppercase md:table-header-group">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-glass-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="grid gap-1 px-4 py-3 align-top md:table-row md:px-0 md:py-0 hover:bg-white/[0.02]">{children}</tr>;
}

export function Cell({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <td className={cn("block md:table-cell md:px-4 md:py-3 md:align-middle", className)}>
      {label && <span className="mr-2 text-[0.75rem] tracking-[0.06em] text-muted uppercase md:hidden">{label}</span>}
      {children}
    </td>
  );
}

const dateTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });

export const formatWhen = (iso: string | null | undefined, withTime = true) => (iso ? (withTime ? dateTime : dateOnly).format(new Date(iso)) : "—");

/** Shown while an admin page loads its data. */
export function PageSkeleton() {
  return (
    <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
      <div className="h-9 w-64 rounded-full bg-white/[0.05]" />
      <div className="h-4 w-96 max-w-full rounded-full bg-white/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-28 rounded-[18px] bg-white/[0.04]" />
        <div className="h-28 rounded-[18px] bg-white/[0.04]" />
        <div className="h-28 rounded-[18px] bg-white/[0.04]" />
      </div>
      <div className="h-64 rounded-[18px] bg-white/[0.03]" />
    </div>
  );
}
