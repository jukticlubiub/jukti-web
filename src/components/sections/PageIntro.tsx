import { MaskReveal, Reveal } from "@/components/ui/Reveal";

/** Top of an inner page: a single warm glow over the ribbed glass, as in the hero. */
export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden px-[clamp(1.25rem,8vw,10rem)] pt-[clamp(10rem,16vw,16rem)] pb-[clamp(4rem,8vw,8rem)] text-center">
      <div aria-hidden className="bg-ribs pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[55%] mx-auto h-[60%] max-w-6xl rounded-[100%] bg-ember-2/70 blur-[110px]"
      />
      <div className="relative">
        <h1 className="font-heading text-[clamp(2.2rem,5vw,5.5rem)]">
          <MaskReveal>{title}</MaskReveal>
        </h1>
        {children && (
          <Reveal className="mx-auto mt-8 max-w-3xl text-[clamp(1.05rem,1.4vw,1.5rem)] leading-relaxed text-body" delay={0.15}>
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}
