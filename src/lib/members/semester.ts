/**
 * IUB IDs start with the intake: 2 digits of the year, then the term (1 = Autumn,
 * 2 = Spring, 3 = Summer). So 2130123 joined in Summer 2021. Ported from the Jukti Reg
 * app's semester helpers, so both apps agree. Safe to import anywhere.
 */

const TERM_NAMES: Record<number, string> = { 1: "Autumn", 2: "Spring", 3: "Summer" };

/** Spring < Summer < Autumn within a year. */
function termIndex(year: number, code: number) {
  return year * 3 + (code === 2 ? 0 : code === 3 ? 1 : 2);
}

function termCodeForMonth(month: number) {
  if (month >= 5 && month <= 8) return 3;
  if (month >= 9) return 1;
  return 2;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** The intake from an ID (or its first 3 digits): { year: 2021, code: 3 }, or null. */
function intakeOf(id: string) {
  if (!/^\d{3}/.test(id)) return null;
  const year = 2000 + Number(id.slice(0, 2));
  const code = Number(id[2]);
  return TERM_NAMES[code] ? { year, code } : null;
}

/** "Summer 2021". */
export function intakeLabel(id: string | null | undefined) {
  const intake = id ? intakeOf(id) : null;
  return intake ? `${TERM_NAMES[intake.code]} ${intake.year}` : null;
}

/** "5th": which semester they're in now (in Dhaka), as the registration form fills it in. */
export function currentSemester(id: string | null | undefined, now: Date) {
  const intake = id ? intakeOf(id) : null;
  if (!intake) return "";
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const current = termIndex(dhaka.getUTCFullYear(), termCodeForMonth(dhaka.getUTCMonth() + 1));
  return ordinal(Math.max(1, current - termIndex(intake.year, intake.code) + 1));
}

/** The 7-digit student ID in an IUB student email, or null. */
export function iubIdFromEmail(email: string | null | undefined) {
  const match = /^(\d{7})@iub\.edu\.bd$/i.exec(email ?? "");
  return match ? match[1] : null;
}
