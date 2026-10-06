import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import type { Alumnus } from "@/lib/data/alumni";
import { AlumnusItem } from "./AlumniNetwork";

/** "Former Faculty Advisors" on /team: the faculty who guided JUKTI before, styled like the Alumni Network. */
export function FormerAdvisors({ advisors }: { advisors: Alumnus[] }) {
  if (advisors.length === 0) return null;
  return (
    <section aria-labelledby="former-advisors-title" className="relative px-5 pt-[clamp(3.5rem,5vw,6rem)] lg:pr-[3vw] lg:pl-[6.87vw]">
      <h2 id="former-advisors-title" className="font-heading text-[clamp(1.9rem,3.6vw,4.25rem)]">
        <MaskReveal>Former Faculty Advisors</MaskReveal>
      </h2>
      <ul className="mt-[clamp(2.25rem,3.5vw,4.25rem)] grid gap-x-[2vw] gap-y-[clamp(1.5rem,2.13vw,2.5rem)] sm:grid-cols-2 lg:grid-cols-3">
        {advisors.map((person, i) => (
          <Reveal as="li" key={person.id} delay={Math.min(i, 8) * 0.05}>
            <AlumnusItem person={person} light />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
