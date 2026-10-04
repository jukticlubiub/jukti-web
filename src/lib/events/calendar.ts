import type { JuktiEvent } from "./types";

type CalendarEvent = Pick<JuktiEvent, "id" | "slug" | "title" | "summary" | "startsAt" | "endsAt" | "venue">;

/** 20261001T083000Z */
function utcStamp(iso: string | Date) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function eventPath(slug: string) {
  return `/events/${slug}`;
}

export function calendarFilePath(slug: string) {
  return `/events/${slug}/calendar.ics`;
}

/** Opens Google Calendar with the event filled in. */
export function googleCalendarUrl(event: CalendarEvent, pageUrl: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.startsAt)}/${utcStamp(event.endsAt)}`,
    details: `${event.summary}\n\n${pageUrl}`,
    location: event.venue,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// RFC 5545 text escaping.
const escapeText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes continue on the next line after a space.
function fold(line: string) {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** An .ics file for Apple Calendar, Outlook and anything else that imports iCalendar. */
export function calendarFile(event: CalendarEvent, pageUrl: string, stamp: Date) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JUKTI//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@jukti.events`,
    `DTSTAMP:${utcStamp(stamp)}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`${event.summary}\n\n${pageUrl}`)}`,
    `LOCATION:${escapeText(event.venue)}`,
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
