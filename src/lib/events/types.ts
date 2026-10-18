export const eventCategories = ["workshop", "contest", "hackathon", "seminar", "social", "orientation"] as const;
export type EventCategory = (typeof eventCategories)[number];

export const categoryLabels: Record<EventCategory, string> = {
  workshop: "Workshop",
  contest: "Contest",
  hackathon: "Hackathon",
  seminar: "Seminar",
  social: "Social",
  orientation: "Orientation",
};

export type AgendaItem = { time: string; title: string; detail?: string };

// --- RSVP configuration (per event) ---

/** iub: only @iub.edu.bd accounts may RSVP. open: anyone signed in with Google. */
export type EventAudience = "iub" | "open";

/** Standard fields an event can collect beyond name + email. Stored in event_registrations.answers. */
export const rsvpStandardFields = ["student_id", "department", "phone", "blood_group"] as const;
export type RsvpStandardField = (typeof rsvpStandardFields)[number];
export const rsvpFieldLabels: Record<RsvpStandardField, string> = {
  student_id: "IUB student ID",
  department: "Department",
  phone: "Phone number",
  blood_group: "Blood group",
};
/** How a standard field is collected. A field absent from the config isn't collected at all. */
export type RsvpFieldMode = "optional" | "required";
export type RsvpFields = Partial<Record<RsvpStandardField, RsvpFieldMode>>;

export const rsvpQuestionTypes = ["short", "long", "select", "checkbox"] as const;
export type RsvpQuestionType = (typeof rsvpQuestionTypes)[number];
export const rsvpQuestionTypeLabels: Record<RsvpQuestionType, string> = {
  short: "Short text",
  long: "Long text",
  select: "Choose one",
  checkbox: "Choose any",
};
export type RsvpQuestion = { id: string; label: string; type: RsvpQuestionType; options: string[]; required: boolean };

/** Read the stored rsvp_fields jsonb into a clean config with only known keys. */
export function parseRsvpFields(raw: unknown): RsvpFields {
  const out: RsvpFields = {};
  if (raw && typeof raw === "object") {
    for (const key of rsvpStandardFields) {
      const v = (raw as Record<string, unknown>)[key];
      if (v === "optional" || v === "required") out[key] = v;
    }
  }
  return out;
}

/** Read the stored rsvp_questions jsonb into a clean list. */
export function parseRsvpQuestions(raw: unknown): RsvpQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((q): RsvpQuestion[] => {
    if (!q || typeof q !== "object") return [];
    const r = q as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const label = typeof r.label === "string" ? r.label : "";
    if (!id || !label) return [];
    const type = (rsvpQuestionTypes as readonly string[]).includes(r.type as string) ? (r.type as RsvpQuestionType) : "short";
    const options = Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === "string") : [];
    return [{ id, label, type, options, required: r.required === true }];
  });
}

export type EventSeats = {
  /** Null means no limit. */
  capacity: number | null;
  registered: number;
  waitlisted: number;
};

export type JuktiEvent = {
  id: string;
  slug: string;
  title: string;
  /** One or two sentences for cards. */
  summary: string;
  /** Plain text; a blank line starts a new paragraph. */
  description: string;
  category: EventCategory;
  /** ISO timestamps. */
  startsAt: string;
  endsAt: string;
  venue: string;
  /** The event poster. Without one, the page draws cover art in the site's style. */
  cover: { url: string; alt: string } | null;
  agenda: AgendaItem[];
  /** A short write-up shown once the event is over. */
  recap: string | null;
  rsvp: EventSeats & {
    enabled: boolean;
    /** ISO timestamp. Null means RSVPs close when the event starts. */
    deadline: string | null;
    /** Who may RSVP, and what the form asks. */
    audience: EventAudience;
    fields: RsvpFields;
    questions: RsvpQuestion[];
  };
  photoCount: number;
  /** A registration fee, paid by bKash and verified by an Event Manager. Null or missing: free. */
  fee?: EventFee | null;
};

export type EventFee = {
  /** In taka. */
  amount: number;
  /** Where to send it; falls back to the club's number. */
  bkashNumber: string | null;
  /** Anything else attendees should know (e.g. "includes lunch and a T-shirt"). */
  note: string | null;
};

export type EventPhoto = {
  id: string;
  /** Missing on sample photos, which are drawn as cover art instead. */
  url?: string;
  alt: string;
  width: number;
  height: number;
};

export type EventStatus = "upcoming" | "ongoing" | "past";
