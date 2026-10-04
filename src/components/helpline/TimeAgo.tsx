"use client";

import { useNow } from "@/components/ui/useNow";

const fullDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const steps: [limit: number, unit: Intl.RelativeTimeFormatUnit, size: number][] = [
  [60, "minute", 1],
  [24 * 60, "hour", 60],
  [7 * 24 * 60, "day", 24 * 60],
  [30 * 24 * 60, "week", 7 * 24 * 60],
];

function ago(minutes: number, date: Date) {
  if (minutes < 1) return "just now";
  for (const [limit, unit, size] of steps) {
    if (minutes < limit) return relative.format(-Math.floor(minutes / size), unit);
  }
  return shortDate.format(date);
}

/** "3 hours ago", with the full date on hover. The date alone while server rendering. */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const now = useNow();
  const date = new Date(iso);
  const label = now === null ? shortDate.format(date) : ago((now - date.getTime()) / 60000, date);
  return (
    <time dateTime={iso} title={`${fullDate.format(date)} (Dhaka)`} className={className}>
      {label}
    </time>
  );
}
