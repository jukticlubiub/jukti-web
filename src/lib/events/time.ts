import type { EventStatus, JuktiEvent } from "./types";

/** Events happen at IUB, so times are always shown in Dhaka time, whoever is looking. */
export const EVENT_TIME_ZONE = "Asia/Dhaka";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  weekday: "short",
});

function parts(iso: string) {
  return Object.fromEntries(partsFormat.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

const dayKey = (iso: string) => partsFormat.format(new Date(iso));

/** "Sat, 3 Oct 2026". Built from parts so it reads the same in every browser. */
export function formatDay(iso: string) {
  const p = parts(iso);
  return `${p.weekday}, ${Number(p.day)} ${p.month} ${p.year}`;
}

/** "2:30 PM", kept on one line. */
export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso)).replace(/\s/g, "\u00a0");
}

/** "Sat, 3 Oct 2026" or "Sat, 24 Oct – Sun, 25 Oct 2026" for multi-day events. */
export function formatDateRange(event: Pick<JuktiEvent, "startsAt" | "endsAt">) {
  if (dayKey(event.startsAt) === dayKey(event.endsAt)) return formatDay(event.startsAt);
  const start = parts(event.startsAt);
  const end = parts(event.endsAt);
  const startText = `${start.weekday}, ${Number(start.day)} ${start.month}`;
  return `${start.year === end.year ? startText : `${startText} ${start.year}`} – ${formatDay(event.endsAt)}`;
}

/** "2:30 PM – 5:00 PM", or the start time for multi-day events. */
export function formatTimeRange(event: Pick<JuktiEvent, "startsAt" | "endsAt">) {
  if (dayKey(event.startsAt) !== dayKey(event.endsAt)) return `Starts ${formatTime(event.startsAt)}`;
  return `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`;
}

/** Day, month, year and weekday in Dhaka time, for date tiles. */
export function dateParts(iso: string) {
  const p = parts(iso);
  return { day: p.day, month: p.month.toUpperCase(), year: p.year, weekday: p.weekday };
}

export function eventYear(iso: string) {
  return dateParts(iso).year;
}

export function eventStatus(event: Pick<JuktiEvent, "startsAt" | "endsAt">, now: number): EventStatus {
  if (now < Date.parse(event.startsAt)) return "upcoming";
  if (now < Date.parse(event.endsAt)) return "ongoing";
  return "past";
}

/** When RSVPs close: the deadline if set, otherwise the start. */
export function rsvpClosesAt(event: Pick<JuktiEvent, "startsAt" | "rsvp">) {
  return event.rsvp.deadline ?? event.startsAt;
}

/**
 * Splits events into what's on now, what's coming (soonest first) and what's past
 * (latest first). The featured event is the first one on now, else the next one.
 */
export function groupEvents(events: JuktiEvent[], now: number) {
  const byStart = [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const ongoing = byStart.filter((e) => eventStatus(e, now) === "ongoing");
  const upcoming = byStart.filter((e) => eventStatus(e, now) === "upcoming");
  const past = byStart.filter((e) => eventStatus(e, now) === "past").reverse();
  const [featured, ...next] = [...ongoing, ...upcoming];
  return { featured: featured ?? null, next, past };
}
