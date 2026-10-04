import { MaskReveal } from "@/components/ui/Reveal";

export function SectionHeading({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <h2 id={id} className="flex items-center gap-4 font-heading text-[clamp(1.9rem,3.6vw,4.25rem)]">
      <MaskReveal>{title}</MaskReveal>
      {count !== undefined && count > 0 && (
        <span className="rounded-full border border-glass-border px-3 py-1.5 font-sans text-[clamp(0.85rem,1vw,1rem)] leading-none font-normal tracking-normal text-muted [-webkit-text-stroke:0]">
          {count}
        </span>
      )}
    </h2>
  );
}
