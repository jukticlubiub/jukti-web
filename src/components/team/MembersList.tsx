"use client";

import { useId, useMemo, useState } from "react";
import { Avatar } from "@/components/members/AccountHeader";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import type { PublicMember } from "@/lib/members/public";
import { ChevronIcon } from "@/components/ui/icons";

/** Members shown before "Show all", so the section stays a section, not a phone book. */
const INITIAL_COUNT = 24;

const searchClass =
  "h-11 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none lg:h-[clamp(2.5rem,2.67vw,3rem)] lg:text-[clamp(0.95rem,1.15vw,1.2rem)]";

/** "Our Members" on /team: every member, searchable and filterable by intake. Styled like the Alumni Network. */
export function MembersList({ members }: { members: PublicMember[] }) {
  const [query, setQuery] = useState("");
  const [intake, setIntake] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();
  const intakeId = useId();

  // Newest intake first: "Autumn 2026", "Summer 2026", …
  const intakes = useMemo(() => {
    const order = (label: string) => {
      const [term, year] = label.split(" ");
      return Number(year) * 3 + ({ Spring: 0, Summer: 1, Autumn: 2 } as Record<string, number>)[term];
    };
    return [...new Set(members.map((m) => m.intake).filter((x): x is string => Boolean(x)))].sort((a, b) => order(b) - order(a));
  }, [members]);

  const q = query.trim().toLowerCase();
  const found = members.filter((m) => (!intake || m.intake === intake) && (!q || `${m.name} ${m.department} ${m.intake ?? ""}`.toLowerCase().includes(q)));
  const visible = q || intake || showAll ? found : found.slice(0, INITIAL_COUNT);
  const hiddenCount = found.length - visible.length;

  if (members.length === 0) return null;

  return (
    <section aria-labelledby="members-title" className="relative px-5 pt-[clamp(3.5rem,5vw,6rem)] pb-[clamp(5rem,9vw,10rem)] lg:pr-[3vw] lg:pl-[6.87vw]">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="members-title" className="font-heading text-[clamp(1.9rem,3.6vw,4.25rem)]">
            <MaskReveal>Our Members</MaskReveal>
          </h2>
          <Reveal as="p" delay={0.05} className="mt-3 text-[clamp(0.95rem,1.15vw,1.2rem)] text-body">
            {members.length} students who make JUKTI happen
          </Reveal>
        </div>
        <Reveal delay={0.1} className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <label htmlFor={intakeId} className="sr-only">
            Intake
          </label>
          <select id={intakeId} value={intake} onChange={(e) => setIntake(e.target.value)} className={`${searchClass} appearance-none sm:w-[12rem]`}>
            <option value="">All intakes</option>
            {intakes.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <label htmlFor={searchId} className="sr-only">
            Search members
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Members"
            autoComplete="off"
            className={`${searchClass} md:w-[clamp(14rem,20vw,22rem)]`}
          />
        </Reveal>
      </div>

      <p role="status" className="sr-only">
        {q || intake ? `${found.length} ${found.length === 1 ? "member" : "members"} found` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-[clamp(2rem,3vw,3.5rem)] grid gap-x-[2vw] gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m, i) => (
            <li key={`${m.name}-${m.intake}-${i}`} className="flex min-w-0 items-center gap-3.5 rounded-[16px] border border-glass-border bg-white/[0.025] p-3 transition-colors duration-300 hover:border-flare/40">
              <Avatar name={m.name} url={m.photoUrl} className="size-12 text-[1.6rem]" />
              <div className="min-w-0">
                <p className="truncate text-[1rem] text-fg">{m.name}</p>
                <p className="truncate text-[0.85rem] text-muted">{[m.department, m.intake].filter(Boolean).join(" · ")}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-[clamp(2.5rem,4.3vw,5rem)] text-body">
          <p className="text-lg">No members match.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIntake("");
            }}
            className="mt-3 text-flare underline underline-offset-4 hover:text-fg"
          >
            Clear filters
          </button>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-[clamp(2rem,3.5vw,4rem)] flex justify-center">
          <button type="button" onClick={() => setShowAll(true)} className="btn-pill btn-more">
            Show all {found.length} members
            <ChevronIcon className="rotate-90" />
          </button>
        </div>
      )}
    </section>
  );
}
