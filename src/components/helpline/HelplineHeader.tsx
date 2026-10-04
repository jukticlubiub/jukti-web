import Link from "next/link";
import { cn } from "@/lib/cn";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";

const tabs = [
  { href: "/helpline", label: "Questions" },
  { href: "/helpline/faculty", label: "Faculty Directory" },
] as const;

/** The helpline's title, a line under it, and the Questions | Faculty Directory tabs. */
export function HelplineHeader({
  title,
  accent,
  subtitle,
  active,
  children,
}: {
  title: string;
  accent: string;
  subtitle: string;
  active: (typeof tabs)[number]["href"];
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="helpline-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
      <h1 id="helpline-title" className="font-heading text-[clamp(1.75rem,4.6vw,5.8rem)]">
        <MaskReveal>
          {title} <span className="text-flare">{accent}</span>
        </MaskReveal>
      </h1>
      <Reveal as="p" delay={0.15} className="mt-[0.45em] text-[clamp(1.1rem,2.3vw,2.6rem)] leading-tight font-light tracking-[-0.03em] text-fg">
        {subtitle}
      </Reveal>
      {children}
      <Reveal delay={0.3} className="mt-10 flex justify-center">
        <nav aria-label="Academic Helpline" className="glass flex rounded-full p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.href === active ? "page" : undefined}
              className={cn(
                "rounded-full px-[clamp(1rem,2vw,1.5rem)] py-2.5 text-[0.92rem] whitespace-nowrap transition-[background-color,color] duration-200",
                tab.href === active ? "bg-lava text-white shadow-[0_8px_28px_-10px_rgb(245_124_72/0.8)]" : "text-body hover:text-fg",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </Reveal>
    </section>
  );
}
