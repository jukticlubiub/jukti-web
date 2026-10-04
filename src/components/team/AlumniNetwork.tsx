"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import type { Alumnus } from "@/lib/data/alumni";
import { Silhouette } from "./Silhouette";

/** Alumni shown before "Show all", so the grid stays scannable as the list grows. */
const INITIAL_COUNT = 12;

function matches(person: Alumnus, query: string) {
  return `${person.name} ${person.role} ${person.term}`.toLowerCase().includes(query);
}

function AlumnusItem({ person }: { person: Alumnus }) {
  const body = (
    <>
      <div className="relative aspect-square w-[clamp(84px,9.8vw,160px)] shrink-0 overflow-hidden rounded-full bg-[radial-gradient(90%_90%_at_50%_30%,#a83f13_55%,#7a2e0e_100%)] transition-shadow duration-500 ease-ui group-hover:shadow-[0_0_0_2px_#f57c48,0_0_36px_-6px_rgb(245_124_72/0.7)]">
        {person.photo ? (
          <Image
            src={person.photo}
            alt=""
            fill
            sizes="(max-width: 1024px) 96px, 10vw"
            className="object-cover object-top grayscale transition-[filter,scale] duration-700 ease-reveal group-hover:scale-[1.06] group-hover:grayscale-0 group-focus-visible:grayscale-0"
          />
        ) : (
          <Silhouette className="text-[#2b0e04]/60" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-heading text-[clamp(1.05rem,1.77vw,1.9rem)] leading-tight tracking-[-0.01em] transition-colors duration-300 group-hover:text-flare">
          {person.name}
        </p>
        <p className="mt-[0.45em] text-[clamp(0.9rem,1.33vw,1.4rem)] leading-snug font-normal text-body">
          {person.role} {person.term}
        </p>
      </div>
    </>
  );

  const layout = "group flex items-center gap-[clamp(0.85rem,1.07vw,1.25rem)]";

  return person.linkedin ? (
    <a
      href={person.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${person.name}, ${person.role} ${person.term}. LinkedIn profile`}
      className={layout}
    >
      {body}
    </a>
  ) : (
    <div className={layout}>{body}</div>
  );
}

/** "Alumni Network" from the Team Jukti design: a searchable grid of past members. */
export function AlumniNetwork({ alumni }: { alumni: Alumnus[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();

  const q = query.trim().toLowerCase();
  const found = q ? alumni.filter((person) => matches(person, q)) : alumni;
  const visible = q || showAll ? found : found.slice(0, INITIAL_COUNT);
  const hiddenCount = found.length - visible.length;

  return (
    <section
      aria-labelledby="alumni-title"
      className="relative px-5 pt-[clamp(2.5rem,2.7vw,3.5rem)] pb-[clamp(5rem,9vw,10rem)] lg:pr-[3vw] lg:pl-[6.87vw]"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <h2 id="alumni-title" className="font-heading text-[clamp(1.9rem,3.6vw,4.25rem)]">
          <MaskReveal>Alumni Network</MaskReveal>
        </h2>
        <Reveal delay={0.1} className="w-full md:w-[clamp(16rem,24.6vw,26rem)]">
          <label htmlFor={searchId} className="sr-only">
            Search alumni
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Alumni"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none lg:h-[clamp(2.5rem,2.67vw,3rem)] lg:text-[clamp(0.95rem,1.15vw,1.2rem)]"
          />
        </Reveal>
      </div>

      <p role="status" className="sr-only">
        {q ? `${found.length} ${found.length === 1 ? "alumnus matches" : "alumni match"} "${query.trim()}"` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-[clamp(2.25rem,3.5vw,4.25rem)] grid gap-x-[2vw] gap-y-[clamp(1.5rem,2.13vw,2.5rem)] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((person, i) => (
            <Reveal as="li" key={person.id} delay={Math.min(i, 8) * 0.05}>
              <AlumnusItem person={person} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-[clamp(2.5rem,4.3vw,5rem)] text-body">
          <p className="text-lg">No alumni match “{query.trim()}”.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-flare underline underline-offset-4 hover:text-fg"
          >
            Clear search
          </button>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-[clamp(2.5rem,4vw,4.5rem)] flex justify-center">
          <button type="button" onClick={() => setShowAll(true)} className="btn-pill btn-ghost">
            Show all {found.length} alumni
          </button>
        </div>
      )}
    </section>
  );
}
