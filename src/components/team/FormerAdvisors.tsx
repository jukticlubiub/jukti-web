import Image from "next/image";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import type { Alumnus } from "@/lib/data/alumni";
import { ProfileLinks } from "./ProfileLinks";
import { Silhouette } from "./Silhouette";

/** A former advisor: a larger round photo on white (like the current advisors' cards), and under it their name, designation, years, email and links. */
function AdvisorItem({ person }: { person: Alumnus }) {
  return (
    <div className="group flex flex-col items-center text-center">
      <div className="relative aspect-square w-[clamp(124px,12.5vw,200px)] overflow-hidden rounded-full bg-[radial-gradient(90%_90%_at_50%_30%,#f6f3ef_55%,#cdc5bd_100%)] transition-shadow duration-500 ease-ui group-hover:shadow-[0_0_0_2px_#f57c48,0_0_40px_-6px_rgb(245_124_72/0.7)]">
        {person.photo ? (
          <Image
            src={person.photo}
            alt=""
            fill
            sizes="(max-width: 640px) 124px, 13vw"
            className="object-cover object-top grayscale transition-[filter,scale] duration-700 ease-reveal group-hover:scale-[1.05] group-hover:grayscale-0 group-focus-within:grayscale-0"
          />
        ) : (
          <Silhouette className="text-black/15" />
        )}
      </div>
      <p className="mt-[clamp(0.9rem,1.2vw,1.35rem)] font-heading text-[clamp(1.05rem,1.6vw,1.75rem)] leading-tight tracking-[-0.01em] text-balance transition-colors duration-300 group-hover:text-flare">
        {person.name}
      </p>
      {person.role && <p className="mt-[0.4em] text-[clamp(0.92rem,1.2vw,1.3rem)] leading-snug text-balance text-body">{person.role}</p>}
      {person.term && <p className="mt-1 text-[clamp(0.82rem,1vw,1.05rem)] text-muted tabular-nums">{person.term}</p>}
      <ProfileLinks name={person.name} email={person.email} links={person.links} className="mt-3.5 justify-center" />
    </div>
  );
}

/** "Former Faculty Advisors" on /team: the faculty who guided JUKTI before, between the Executive Board and the alumni. */
export function FormerAdvisors({ advisors }: { advisors: Alumnus[] }) {
  if (advisors.length === 0) return null;
  return (
    <section aria-labelledby="former-advisors-title" className="relative px-5 pt-[clamp(3.5rem,5vw,6rem)] lg:pr-[3vw] lg:pl-[6.87vw]">
      <h2 id="former-advisors-title" className="font-heading text-[clamp(1.9rem,3.6vw,4.25rem)]">
        <MaskReveal>Former Faculty Advisors</MaskReveal>
      </h2>
      <ul className="mt-[clamp(2.25rem,3.5vw,4.25rem)] grid grid-cols-2 gap-x-[clamp(1rem,2.5vw,3rem)] gap-y-[clamp(2.25rem,3vw,3.5rem)] sm:grid-cols-3 lg:grid-cols-4">
        {advisors.map((person, i) => (
          <Reveal as="li" key={person.id} delay={Math.min(i, 8) * 0.05}>
            <AdvisorItem person={person} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
