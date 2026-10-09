"use client";

import { useId, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { categoryLabels } from "@/lib/events/types";
import { EventCard, type EventCardData } from "./EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChevronIcon } from "@/components/ui/icons";

/** Events shown before "Show all", so the archive stays scannable as it grows. */
const INITIAL_COUNT = 6;

export type PastEventItem = EventCardData & { year: string };

function matches(event: PastEventItem, query: string) {
  return `${event.title} ${event.summary} ${categoryLabels[event.category]} ${event.dateLabel}`.toLowerCase().includes(query);
}

/** The archive: every past event, latest first, filterable by year and searchable. */
export function PastEvents({ events }: { events: PastEventItem[] }) {
  const [year, setYear] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();

  const years = [...new Set(events.map((e) => e.year))];
  const q = query.trim().toLowerCase();
  const found = events.filter((e) => (!year || e.year === year) && (!q || matches(e, q)));
  const visible = showAll || q ? found : found.slice(0, INITIAL_COUNT);
  const hiddenCount = found.length - visible.length;

  const pill = (active: boolean) =>
    cn(
      "h-10 rounded-full border px-4 text-[0.9rem] transition-[background-color,border-color,color] duration-200",
      active ? "border-flare bg-lava text-white" : "border-glass-border bg-glass text-body hover:border-flare/50 hover:text-fg",
    );

  return (
    <section aria-labelledby="past-title" className="relative">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading id="past-title" title="Past Events" />
        <Reveal delay={0.1} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {years.length > 1 && (
            <div role="group" aria-label="Filter by year" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={year === null} onClick={() => setYear(null)} className={pill(year === null)}>
                All
              </button>
              {years.map((y) => (
                <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className={pill(year === y)}>
                  {y}
                </button>
              ))}
            </div>
          )}
          <label htmlFor={searchId} className="sr-only">
            Search past events
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Events"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none sm:w-60"
          />
        </Reveal>
      </div>

      <p role="status" className="sr-only">
        {q || year ? `${found.length} ${found.length === 1 ? "event" : "events"} found` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-[clamp(2rem,3vw,3.25rem)] grid gap-[clamp(1rem,1.6vw,1.75rem)] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((event, i) => (
            <Reveal as="li" key={event.slug} delay={Math.min(i, 5) * 0.06}>
              <EventCard event={event} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-10 text-body">
          <p className="text-lg">No past events match{q ? ` “${query.trim()}”` : ""}{year ? ` in ${year}` : ""}.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setYear(null);
            }}
            className="mt-3 text-flare underline underline-offset-4 hover:text-fg"
          >
            Clear filters
          </button>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-[clamp(2.5rem,4vw,4rem)] flex justify-center">
          <button type="button" onClick={() => setShowAll(true)} className="btn-pill btn-more">
            Show all {found.length} events
            <ChevronIcon className="rotate-90" />
          </button>
        </div>
      )}
    </section>
  );
}
