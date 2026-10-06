"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/helpline/fields";
import { LinkedInIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DirectoryEntry } from "@/lib/members/types";
import { Avatar } from "./AccountHeader";

function matches(m: DirectoryEntry, q: string) {
  return [m.name, m.department, m.intake, m.bio, ...m.skills, ...m.interests, ...m.coCurricular].join(" ").toLowerCase().includes(q);
}

/** Members who opted in: search by anything, filter by an interest, find teammates. */
export function Directory({ members, youId }: { members: DirectoryEntry[]; youId: string }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  // The interests and activities people listed, most common first.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) for (const t of [...m.coCurricular, ...m.interests]) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
  }, [members]);

  const q = query.trim().toLowerCase();
  const shown = members.filter((m) => (!q || matches(m, q)) && (!tag || m.interests.includes(tag) || m.coCurricular.includes(tag)));

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, skills, interests…"
          aria-label="Search the directory"
          className={cn(inputClass, "h-12 rounded-full px-5")}
        />
        {tags.length > 0 && (
          <div role="group" aria-label="Filter by interest" className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className="h-9 rounded-full border border-glass-border bg-glass px-3.5 text-[0.84rem] text-body transition-colors hover:border-flare/50 hover:text-fg aria-pressed:border-flare aria-pressed:bg-lava aria-pressed:text-white"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[0.88rem] text-muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? "member" : "members"}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-glass-border px-6 py-12 text-center text-body/85">No one matches that yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <li key={m.id} className="glass-card flex flex-col p-5">
              <div className="flex items-center gap-3.5">
                <Avatar name={m.name} url={m.photoUrl} className="size-14 text-[2rem]" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">
                    {m.name}
                    {m.id === youId && <span className="ml-2 text-[0.75rem] text-flare">You</span>}
                  </p>
                  <p className="truncate text-[0.85rem] text-muted">{[m.department, m.intake].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {m.bio && <p className="mt-3 line-clamp-3 text-[0.92rem] leading-relaxed text-body/90">{m.bio}</p>}
              {m.skills.length > 0 && (
                <ul aria-label="Skills" className="mt-3 flex flex-wrap gap-1.5">
                  {m.skills.map((s) => (
                    <li key={s} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[0.76rem] text-body">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              {(m.linkedin || m.github) && (
                <div className="mt-auto flex gap-3 pt-4 text-[0.85rem]">
                  {m.linkedin && (
                    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-flare">
                      <LinkedInIcon className="size-4" />
                      LinkedIn
                    </a>
                  )}
                  {m.github && (
                    <a href={m.github} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-flare">
                      GitHub
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
