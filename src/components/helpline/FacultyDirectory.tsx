"use client";

import { useId, useState } from "react";
import { CopyEmail } from "@/components/contact/CopyEmail";
import { AuthorAvatar } from "@/components/logs/Author";
import { DoorIcon, MailIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import type { Faculty } from "@/lib/helpline/types";
import { pillClass } from "./QuestionBoard";

type Rank = "professor" | "associate" | "assistant" | "lecturer" | "other";

const rankLabels: Record<Rank, string> = {
  professor: "Professors",
  associate: "Associate Professors",
  assistant: "Assistant Professors",
  lecturer: "Lecturers",
  other: "Others",
};

function rankOf(designation: string): Rank {
  const d = designation.toLowerCase();
  if (d.startsWith("associate professor")) return "associate";
  if (d.startsWith("assistant professor")) return "assistant";
  if (d.startsWith("professor")) return "professor";
  if (d.startsWith("lecturer")) return "lecturer";
  return "other";
}

/** The CSE faculty as cards, filterable by rank and searchable by name, room or email. */
export function FacultyDirectory({ faculty }: { faculty: Faculty[] }) {
  const [rank, setRank] = useState<Rank | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const q = query.trim().toLowerCase();
  const ranks = (Object.keys(rankLabels) as Rank[]).filter((r) => faculty.some((f) => rankOf(f.designation) === r));
  const found = faculty.filter(
    (f) =>
      (!rank || rankOf(f.designation) === rank) &&
      (!q || `${f.name} ${f.designation} ${f.room ?? ""} ${f.email}`.toLowerCase().includes(q)),
  );

  return (
    <section aria-label="Faculty directory">
      <Reveal className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by rank" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={rank === null} onClick={() => setRank(null)} className={pillClass(rank === null)}>
            All <span className={cn("ml-1.5 tabular-nums", rank === null ? "text-white/80" : "text-muted")}>{faculty.length}</span>
          </button>
          {ranks.map((r) => (
            <button key={r} type="button" aria-pressed={rank === r} onClick={() => setRank(rank === r ? null : r)} className={pillClass(rank === r)}>
              {rankLabels[r]}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={searchId} className="sr-only">
            Search by name, room or email
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or room"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-transparent bg-[#6f6f6f] px-5 text-base font-light text-white transition-[border-color,background-color] duration-200 placeholder:text-white/85 hover:bg-[#767676] focus:border-flare focus:outline-none lg:w-64"
          />
        </div>
      </Reveal>

      <p role="status" className="sr-only">
        {q || rank ? `${found.length} found` : ""}
      </p>

      {found.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {found.map((f, i) => (
            <Reveal as="li" key={f.id} delay={Math.min(i, 5) * 0.04}>
              <FacultyCard faculty={f} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-10 text-body">
          <p className="text-lg">
            {faculty.length === 0 ? "The directory is being updated. Please check back soon." : `No one matches “${query.trim()}”.`}
          </p>
          {faculty.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRank(null);
              }}
              className="mt-3 text-flare underline underline-offset-4 hover:text-fg"
            >
              Clear the search
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <article className="glass-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <AuthorAvatar author={{ name: faculty.name.replace(/^(Dr\.|Ms\.|Mr\.|Mrs\.)\s+/i, ""), role: null, avatarUrl: faculty.photoUrl }} className="size-12" />
        <div className="min-w-0">
          <h3 className="text-[1.08rem] leading-snug font-medium text-fg">{faculty.name}</h3>
          <p className="mt-1 text-[0.9rem] leading-snug text-muted">{faculty.designation}</p>
        </div>
      </div>
      <div aria-hidden className="min-h-5 flex-1" />
      <dl className="grid gap-2.5 border-t border-glass-border pt-4 text-[0.95rem]">
        <div className="flex items-center gap-2.5">
          <dt className="text-flare">
            <DoorIcon />
            <span className="sr-only">Room</span>
          </dt>
          <dd className={faculty.room ? "text-fg" : "text-muted"}>{faculty.room ?? "Room not listed"}</dd>
        </div>
        <div className="flex items-center gap-2.5">
          <dt className="text-flare">
            <MailIcon />
            <span className="sr-only">Email</span>
          </dt>
          <dd className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <a href={`mailto:${faculty.email}`} className="min-w-0 truncate text-body transition-colors hover:text-flare">
              {faculty.email}
            </a>
            <CopyEmail email={faculty.email} iconOnly />
          </dd>
        </div>
      </dl>
    </article>
  );
}
