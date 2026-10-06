import Link from "next/link";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { statusInfo, type MemberStatus } from "@/lib/members/options";

export const accountTabs = [
  { href: "/account", label: "Profile" },
  { href: "/account/card", label: "Member card" },
  { href: "/account/activity", label: "Activity" },
  { href: "/members", label: "Directory" },
] as const;

export type AccountTab = (typeof accountTabs)[number]["href"];

/** The title of the member pages, a line under it, and the Profile | Card | Activity | Directory tabs. */
export function AccountHeader({
  title,
  accent,
  subtitle,
  active,
  tabs = true,
}: {
  title: string;
  accent: string;
  subtitle: string;
  active?: AccountTab;
  tabs?: boolean;
}) {
  return (
    <section aria-labelledby="account-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,16rem)] text-center">
      <h1 id="account-title" className="font-heading text-[clamp(1.75rem,4.6vw,5.4rem)]">
        <MaskReveal>
          {title} <span className="text-flare">{accent}</span>
        </MaskReveal>
      </h1>
      <Reveal as="p" delay={0.15} className="mt-[0.45em] text-[clamp(1.05rem,2vw,2.2rem)] leading-tight font-light tracking-[-0.03em] text-fg">
        {subtitle}
      </Reveal>
      {tabs && (
        <Reveal delay={0.3} className="mt-10 flex justify-center">
          <nav aria-label="Your account" className="glass flex max-w-full overflow-x-auto rounded-full p-1">
            {accountTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.href === active ? "page" : undefined}
                className={cn(
                  "rounded-full px-[clamp(0.85rem,2vw,1.5rem)] py-2.5 text-[0.9rem] whitespace-nowrap transition-[background-color,color] duration-200",
                  tab.href === active ? "bg-lava text-white shadow-[0_8px_28px_-10px_rgb(245_124_72/0.8)]" : "text-body hover:text-fg",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </Reveal>
      )}
    </section>
  );
}

const tones = {
  amber: "border-amber-300/35 bg-amber-300/10 text-amber-200",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  red: "border-[#ff8f7a]/40 bg-[#ff8f7a]/10 text-[#ffb4a6]",
  neutral: "border-glass-border bg-white/[0.04] text-muted",
} as const;

export function StatusPill({ status, className }: { status: MemberStatus; className?: string }) {
  const info = statusInfo[status];
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[0.78rem] font-medium whitespace-nowrap", tones[info.tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {info.label}
    </span>
  );
}

/** A round photo, or initials on the club's lava when there's none. */
export function Avatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[radial-gradient(90%_90%_at_50%_30%,#a83f13_55%,#7a2e0e_100%)] font-heading text-white", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- member photos from storage (or a fresh preview)
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden className="text-[0.38em]">{initials || "?"}</span>
      )}
    </span>
  );
}

/** A small orange caps label over a section. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase", className)}>{children}</p>;
}
