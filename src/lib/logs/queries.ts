import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sampleLogs } from "@/lib/data/logs";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { readingMinutes } from "./text";
import { logCategories, type JuktiLog, type LogCategory } from "./types";

/** Cache tag for the logs. Invalidate it after publishing or editing one. */
export const LOGS_TAG = "logs";

type LogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  cover_url: string | null;
  cover_alt: string;
  author_name: string;
  author_role: string | null;
  author_avatar_url: string | null;
  published_at: string;
  updated_at: string;
};

/**
 * Every published log, newest first. Shared by all visitors and cached. Drafts and
 * scheduled posts never come back here: the query has no session, and the table's
 * row-level security only shows anonymous readers what's live.
 */
export async function getLogs(): Promise<JuktiLog[]> {
  "use cache";
  cacheTag(LOGS_TAG);
  cacheLife("hours");

  if (!supabaseEnv) return sampleLogs;

  const { data, error } = await createPublicClient()
    .from("logs")
    .select(
      "id, slug, title, excerpt, body, category, cover_url, cover_alt, author_name, author_role, author_avatar_url, published_at, updated_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Couldn't load logs: ${error.message}`);

  const rows = data as LogRow[];
  return rows.map((row, i) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: (logCategories as readonly string[]).includes(row.category) ? (row.category as LogCategory) : "news",
    cover: row.cover_url ? { url: row.cover_url, alt: row.cover_alt } : null,
    author: { name: row.author_name, role: row.author_role, avatarUrl: row.author_avatar_url },
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: readingMinutes(row.body),
    // Newest first, so the oldest is LOG 001.
    number: rows.length - i,
  }));
}

export async function getLog(slug: string) {
  return (await getLogs()).find((log) => log.slug === slug) ?? null;
}

/** Up to `count` other logs: the same category first, then the latest. */
export async function getRelatedLogs(log: JuktiLog, count = 3) {
  const others = (await getLogs()).filter((other) => other.id !== log.id);
  const sameCategory = others.filter((other) => other.category === log.category);
  const rest = others.filter((other) => other.category !== log.category);
  return [...sameCategory, ...rest].slice(0, count);
}
