import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/Logo";
import { GlassCard } from "@/components/glass/GlassCard";
import { PageIntro } from "@/components/sections/PageIntro";
import { PillButton } from "@/components/ui/PillButton";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "void", hex: "#000000", role: "Section background" },
  { name: "charcoal", hex: "#151515", role: "Top of page, header" },
  { name: "planet", hex: "#0B0401", role: "Eclipse planet body" },
  { name: "ember-1", hex: "#421B08", role: "Sky glow" },
  { name: "ember-2", hex: "#662A11", role: "Rim glow" },
  { name: "lava", hex: "#C84A1A", role: "Button fill (white 4.72:1)" },
  { name: "flare", hex: "#F57C48", role: "Glow, links, accents (7.86:1)" },
  { name: "fg", hex: "#FFFFFF", role: "Headings, nav" },
  { name: "body", hex: "#E6E1DD", role: "Body text (16.18:1)" },
  { name: "muted", hex: "#9A918B", role: "Meta, captions (6.8:1)" },
];

const cards = [
  { title: "Glass card", text: "Move your cursor across it: the sheen and the edge highlight follow, and it tilts slightly." },
  { title: "Event card", text: "Events, logs and team members all sit in these panels over the ribbed glass." },
  { title: "Reduced motion", text: "With reduced motion turned on, the tilt is off and everything appears in place." },
];

export default function StyleguidePage() {
  return (
    <>
      <PageIntro title="Style guide">
        Tokens and components from the homepage design. Fonts are the free stand-ins (Michroma and Inter Tight) until
        the licensed Microgramma D Extended and Neue Montreal are in.
      </PageIntro>

      <div className="mx-auto max-w-7xl space-y-24 px-[clamp(1.25rem,4vw,4rem)] pb-32">
        <section aria-labelledby="sg-colors">
          <h2 id="sg-colors" className="font-heading mb-8 text-2xl">Colors</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {swatches.map((s) => (
              <li key={s.name} className="overflow-hidden rounded-[var(--radius-card)] border border-glass-border">
                <div className="h-24" style={{ backgroundColor: s.hex }} />
                <div className="space-y-1 p-4 text-sm">
                  <p className="font-medium text-fg">{s.name}</p>
                  <p className="font-mono text-muted">{s.hex}</p>
                  <p className="text-body">{s.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sg-type" className="space-y-8">
          <h2 id="sg-type" className="font-heading mb-8 text-2xl">Type</h2>
          <p className="font-heading text-[clamp(2.3rem,6.7vw,8.5rem)]">JUKTIverse</p>
          <p className="font-heading text-[clamp(2.1rem,4.1vw,5rem)]">Our History</p>
          <p className="max-w-4xl text-[clamp(1.05rem,1.77vw,2.1rem)] leading-[1.63] tracking-[-0.02em]">
            Body text is light and generous, with <strong className="font-medium text-fg">names in medium weight</strong>,
            exactly as the history section in the design.
          </p>
          <p className="text-muted">Muted text for dates, captions and metadata.</p>
        </section>

        <section aria-labelledby="sg-buttons">
          <h2 id="sg-buttons" className="font-heading mb-8 text-2xl">Buttons</h2>
          <div className="flex flex-wrap items-center gap-4">
            <PillButton href="/contact">Contact us</PillButton>
            <PillButton href="/join">Join us</PillButton>
            <PillButton href="/about" variant="ghost">
              Read our story
            </PillButton>
          </div>
        </section>

        <section aria-labelledby="sg-glass" className="relative">
          <div aria-hidden className="bg-ribs absolute -inset-x-8 -inset-y-16 rounded-[32px] opacity-80" />
          <div aria-hidden className="absolute inset-x-0 top-1/3 mx-auto h-2/3 max-w-4xl rounded-full bg-lava/40 blur-[90px]" />
          <h2 id="sg-glass" className="font-heading relative mb-8 text-2xl">Interactive glass</h2>
          <div className="relative grid gap-6 md:grid-cols-3">
            {cards.map((c) => (
              <GlassCard key={c.title} className="p-7">
                <LogoMark className="mb-6 w-8 text-flare" />
                <h3 className="mb-2 text-lg font-medium text-fg">{c.title}</h3>
                <p className="text-body">{c.text}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
