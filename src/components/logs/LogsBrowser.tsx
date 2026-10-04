"use client";

import { useId, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { logCategoryLabels, logCategoryPlurals, type LogCardData, type LogCategory } from "@/lib/logs/types";
import { LogCard } from "./LogCard";

/** Logs shown before "Show all". */
const INITIAL_COUNT = 9;

function matches(log: LogCardData, query: string) {
  return `${log.title} ${log.excerpt} ${logCategoryLabels[log.category]} ${log.author.name}`.toLowerCase().includes(query);
}

/**
 * Every log after the featured one, filterable by category and searchable. While a
 * filter or search is on, the featured log is included too, so nothing is missed.
 */
export function LogsBrowser({ logs, featuredSlug }: { logs: LogCardData[]; featuredSlug: string | null }) {
  const [category, setCategory] = useState<LogCategory | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();

  const categories = [...new Set(logs.map((log) => log.category))];
  const q = query.trim().toLowerCase();
  const filtering = category !== null || q !== "";
  const pool = filtering ? logs : logs.filter((log) => log.slug !== featuredSlug);
  const found = pool.filter((log) => (!category || log.category === category) && (!q || matches(log, q)));
  const visible = showAll || filtering ? found : found.slice(0, INITIAL_COUNT);
  const hiddenCount = found.length - visible.length;

  const pill = (active: boolean) =>
    cn(
      "h-10 rounded-full border px-4 text-[0.9rem] transition-[background-color,border-color,color] duration-200",
      active ? "border-flare bg-lava text-white" : "border-glass-border bg-glass text-body hover:border-flare/50 hover:text-fg",
    );

  return (
    <section aria-labelledby="all-logs-title" className="relative">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeading id="all-logs-title" title="All Logs" count={logs.length} />
        <Reveal delay={0.1} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {categories.length > 1 && (
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={pill(category === null)}>
                All
              </button>
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={pill(category === c)}>
                  {logCategoryPlurals[c]}
                </button>
              ))}
            </div>
          )}
          <label htmlFor={searchId} className="sr-only">
            Search logs
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Logs"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none lg:w-56"
          />
        </Reveal>
      </div>

      <p role="status" className="sr-only">
        {filtering ? `${found.length} ${found.length === 1 ? "log" : "logs"} found` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-[clamp(2rem,3vw,3.25rem)] grid gap-[clamp(1rem,1.6vw,1.75rem)] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((log, i) => (
            <Reveal as="li" key={log.slug} delay={Math.min(i, 5) * 0.06}>
              <LogCard log={log} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-10 text-body">
          <p className="text-lg">
            No logs match{q ? ` “${query.trim()}”` : ""}
            {category ? ` in ${logCategoryPlurals[category]}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(null);
            }}
            className="mt-3 text-flare underline underline-offset-4 hover:text-fg"
          >
            Clear filters
          </button>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-[clamp(2.5rem,4vw,4rem)] flex justify-center">
          <button type="button" onClick={() => setShowAll(true)} className="btn-pill btn-ghost">
            Show all {found.length} logs
          </button>
        </div>
      )}
    </section>
  );
}
