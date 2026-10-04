import type { ZodError } from "zod";

/** What every admin form action returns. */
export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Goes up on each success, so a form can reset or show "Saved". */
  saved?: number;
  /** The id of a row just created, so the page can open it. */
  id?: string;
};

export const idle: ActionState = { status: "idle" };

export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export const ok = (previous: ActionState, message = "Saved.", id?: string): ActionState => ({
  status: "ok",
  message,
  saved: (previous.saved ?? 0) + 1,
  id,
});

export const failed = (message: string, errors?: Record<string, string>): ActionState => ({ status: "error", message, fieldErrors: errors });

/** Friendly text for errors raised by the database (row-level security, checks and our own codes). */
export function explainDbError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (message.includes("row-level security") || message.includes("not_allowed") || message.includes("permission denied"))
    return "Your role doesn't allow this change.";
  if (message.includes("duplicate key")) return "That already exists. Use a different value.";
  if (message.includes("last_master_admin")) return "There must always be at least one Master Admin.";
  if (message.includes("violates check constraint")) return "One of the values isn't allowed. Check the form and try again.";
  return "Something went wrong. Please try again.";
}

/** Form value helpers. */
export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const optional = (fd: FormData, key: string) => str(fd, key) || null;
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

/*
 * Dates: the panel edits times in Dhaka time (UTC+6, no daylight saving) with
 * <input type="datetime-local">, and stores them as ISO timestamps.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** ISO → "2026-10-08T15:00" in Dhaka time, for a datetime-local input. */
export function toDhakaInput(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(Date.parse(iso) + DHAKA_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-08T15:00" (Dhaka time) → ISO, or null if empty or invalid. */
export function fromDhakaInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00+06:00`).toISOString();
}

/** "my-first-event" from a title. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
