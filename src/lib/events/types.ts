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
  };
  photoCount: number;
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
