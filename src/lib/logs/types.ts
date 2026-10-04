export const logCategories = ["tutorial", "news", "recap", "career", "research", "story"] as const;
export type LogCategory = (typeof logCategories)[number];

export const logCategoryLabels: Record<LogCategory, string> = {
  tutorial: "Tutorial",
  news: "News",
  recap: "Recap",
  career: "Career",
  research: "Research",
  story: "Story",
};

/** For the category filter: "Tutorials", "Recaps", ... */
export const logCategoryPlurals: Record<LogCategory, string> = {
  tutorial: "Tutorials",
  news: "News",
  recap: "Recaps",
  career: "Careers",
  research: "Research",
  story: "Stories",
};

export type LogAuthor = {
  name: string;
  role: string | null;
  avatarUrl: string | null;
};

export type JuktiLog = {
  id: string;
  slug: string;
  title: string;
  /** One or two sentences for cards, the feed and link previews. */
  excerpt: string;
  /** Markdown (GitHub flavored). */
  body: string;
  category: LogCategory;
  cover: { url: string; alt: string } | null;
  author: LogAuthor;
  /** ISO timestamps. */
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  /** Its place in the log, oldest first: LOG 001, LOG 002, ... */
  number: number;
};

/** An h2 or h3 in a log, for the table of contents. */
export type LogHeading = { depth: 2 | 3; text: string; id: string };

/** What a card needs: a log without its body, with the date formatted on the server. */
export type LogCardData = Pick<
  JuktiLog,
  "slug" | "title" | "excerpt" | "category" | "cover" | "author" | "readingMinutes" | "number"
> & {
  /** e.g. "28 Sep 2026" */
  dateLabel: string;
};
