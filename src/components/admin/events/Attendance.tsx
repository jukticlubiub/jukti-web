"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { setCheckInDays, toggleCheckIn } from "@/lib/admin/actions/events";
import { addStation, markStation, removeStation } from "@/lib/admin/actions/members";
import type { Registration, Station } from "@/lib/admin/data/events";
import { cn } from "@/lib/cn";
import { ActionButton, AdminForm, inputClass, Select, TextField } from "../forms";

const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });
const at = (iso: string) => time.format(new Date(iso));

/** Re-reads the page every 15 seconds while it's visible, so several scanners' work shows up here. */
function useAutoRefresh(seconds = 15) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
}

const dayOptions = Array.from({ length: 14 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "1 day" : `${i + 1} days` }));

/**
 * The event-day dashboard, one day at a time: how many are in and served at each of that day's
 * stations, the stations themselves, and everyone confirmed with their check-in and station times.
 * Anyone without a card can be checked in or marked here by hand; mistakes can be undone. The
 * event's number of check-in days is set here too.
 */
export function Attendance({
  eventId,
  registrations,
  stations,
  scans,
  days = 1,
  defaultDay = 1,
  today = null,
  dayCheckIns = {},
}: {
  eventId: string;
  registrations: Registration[];
  stations: Station[];
  scans: Record<string, Record<string, string>>;
  days?: number;
  /** The day shown first (today's, during the event). */
  defaultDay?: number;
  /** Today's day of the event, or null before or after it. */
  today?: number | null;
  /** registration id → day → when they checked in that day. */
  dayCheckIns?: Record<string, Record<number, string>>;
}) {
  useAutoRefresh();
  const [picked, setDay] = useState(defaultDay);
  const day = Math.min(picked, days);
  const multiDay = days > 1;
  const confirmed = useMemo(() => registrations.filter((r) => r.status === "registered"), [registrations]);
  // That day's check-in. One-day events keep using the registration's own time (always the same thing).
  const entryAt = (r: Registration, d = day) => (multiDay ? (dayCheckIns[r.id]?.[d] ?? null) : r.checkedInAt);
  const dayStations = stations.filter((s) => s.day === day);
  const inside = confirmed.filter((r) => entryAt(r)).length;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const entryLabel = multiDay ? `Day ${day} check-in` : "Checked in";

  const rows = confirmed.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !`${r.fullName} ${r.email} ${r.studentId} ${r.ticketCode}`.toLowerCase().includes(q)) return false;
    if (filter === "out") return !entryAt(r);
    if (filter === "in") return Boolean(entryAt(r));
    if (filter.startsWith("missing:")) return Boolean(entryAt(r)) && !scans[r.id]?.[filter.slice(8)];
    return true;
  });

  return (
    <div className="grid gap-6">
      {multiDay && (
        <div role="tablist" aria-label="Day" className="flex flex-wrap gap-2">
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={day === d}
              onClick={() => {
                setDay(d);
                setFilter("all");
              }}
              className="rounded-full border border-glass-border px-4 py-2 text-[0.9rem] text-body transition-colors hover:border-flare/50 aria-selected:border-flare aria-selected:bg-lava aria-selected:text-white"
            >
              Day {d}
              <span className="ml-2 text-[0.78rem] tabular-nums opacity-80">{confirmed.filter((r) => entryAt(r, d)).length} in</span>
              {d === today && <span className="ml-1.5 text-[0.75rem] opacity-80">· today</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meter label={entryLabel} value={inside} of={confirmed.length} hint={`of ${confirmed.length} confirmed`} />
        {dayStations.map((s) => {
          const served = confirmed.filter((r) => scans[r.id]?.[s.id]).length;
          return <Meter key={s.id} label={s.name} value={served} of={inside} hint={`of ${inside} inside`} />;
        })}
      </div>

      <div className="grid gap-4 rounded-[16px] border border-glass-border p-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <AdminForm key={days} action={setCheckInDays} submitLabel="Save" className="flex flex-wrap items-end gap-2 [&>div:last-child]:flex-nowrap">
            {(state) => (
              <>
                <input type="hidden" name="eventId" value={eventId} />
                <Select label="Check-in runs for" name="days" state={state} defaultValue={String(days)} options={dayOptions} className="w-40" />
              </>
            )}
          </AdminForm>
          <p className="pb-3 text-[0.82rem] text-muted/80">Each day gets its own check-in and its own stations.</p>
        </div>
        <div>
          <p className="text-[0.85rem] text-muted">{multiDay ? `Day ${day} stations` : "Stations"}</p>
          <p className="mt-1 text-[0.82rem] text-muted/80">
            Things given out once per person{multiDay ? " on this day" : ""}, e.g. Lunch, Snacks, T-shirt. Each gets its own scan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dayStations.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-glass-border py-1 pr-1 pl-3 text-[0.88rem] text-fg">
              {s.name}
              <ActionButton
                action={removeStation}
                fields={{ id: s.id }}
                label="×"
                tone="ghost"
                className="h-6 border-0 px-2"
                confirm={`Remove ${s.name}? Its scans are deleted too.`}
              />
            </span>
          ))}
          <AdminForm key={day} action={addStation} submitLabel={multiDay ? `Add to Day ${day}` : "Add station"} resetOnSave className="flex flex-wrap items-end gap-2 [&>div:last-child]:flex-nowrap">
            {(state) => (
              <>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="day" value={day} />
                <TextField label="New station" name="name" state={state} placeholder="e.g. Lunch" maxLength={40} className="w-44 [&_label]:sr-only" />
              </>
            )}
          </AdminForm>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or ID" aria-label="Search" className={cn(inputClass, "h-10 max-w-xs text-[0.9rem]")} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show" className={cn(inputClass, "h-10 w-auto bg-[#141110] text-[0.9rem]")}>
          <option value="all">Everyone confirmed</option>
          <option value="out">Not checked in{multiDay ? ` on Day ${day}` : ""}</option>
          <option value="in">Checked in{multiDay ? ` on Day ${day}` : ""}</option>
          {dayStations.map((s) => (
            <option key={s.id} value={`missing:${s.id}`}>
              Inside, no {s.name} yet
            </option>
          ))}
        </select>
        <p className="self-center text-[0.85rem] text-muted">{rows.length} shown · updates every 15 s</p>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[0.92rem] text-muted">{confirmed.length === 0 ? "No confirmed RSVPs yet." : "No one matches."}</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-glass-border">
          <table className="w-full min-w-[36rem] text-left text-[0.9rem]">
            <thead className="bg-white/[0.03] text-[0.72rem] tracking-[0.08em] text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">{multiDay ? `Day ${day} check-in` : "Entry"}</th>
                {dayStations.map((s) => (
                  <th key={s.id} className="px-4 py-2.5 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5">
                    <span className="block text-fg">
                      {r.fullName}
                      {(r.payment.status === "unpaid" || r.payment.status === "submitted") && (
                        <span className="ml-2 rounded-full border border-amber-300/40 px-2 py-0.5 text-[0.72rem] text-amber-200">Not paid</span>
                      )}
                    </span>
                    <span className="block text-[0.8rem] text-muted tabular-nums">
                      {r.studentId || "Guest"} · <span className="font-mono">{r.ticketCode}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Cell
                      doneAt={entryAt(r)}
                      mark={<ActionButton action={toggleCheckIn} fields={{ id: r.id, checkedIn: "false", day: String(day) }} label="Check in" tone="primary" />}
                      undo={
                        <ActionButton
                          action={toggleCheckIn}
                          fields={{ id: r.id, checkedIn: "true", day: String(day) }}
                          label="Undo"
                          confirm={multiDay ? `Undo ${r.fullName}’s Day ${day} check-in?` : "Undo this check-in?"}
                        />
                      }
                    />
                  </td>
                  {dayStations.map((s) => (
                    <td key={s.id} className="px-4 py-2.5">
                      <Cell
                        doneAt={scans[r.id]?.[s.id] ?? null}
                        mark={<ActionButton action={markStation} fields={{ stationId: s.id, registrationId: r.id, done: "true" }} label="Mark" />}
                        undo={<ActionButton action={markStation} fields={{ stationId: s.id, registrationId: r.id, done: "false" }} label="Undo" confirm={`Undo ${s.name} for ${r.fullName}?`} />}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({ doneAt, mark, undo }: { doneAt: string | null; mark: React.ReactNode; undo: React.ReactNode }) {
  if (!doneAt) return <>{mark}</>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-emerald-300 tabular-nums">✓ {at(doneAt)}</span>
      {undo}
    </span>
  );
}

function Meter({ label, value, of, hint }: { label: string; value: number; of: number; hint: string }) {
  const pct = of > 0 ? Math.round((value / of) * 100) : 0;
  return (
    <div className="rounded-[16px] border border-glass-border bg-white/[0.025] p-4">
      <p className="text-[0.78rem] tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className="mt-1.5 font-heading text-[2rem] leading-none text-fg tabular-nums">{value}</p>
      <p className="mt-1 text-[0.82rem] text-muted">{hint}</p>
      <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-flare transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
