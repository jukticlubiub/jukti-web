const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "28 Sep 2026", in Dhaka time. Built from parts so it reads the same everywhere. */
export function formatLogDate(iso: string) {
  const p = Object.fromEntries(dateFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${p.day} ${p.month} ${p.year}`;
}
