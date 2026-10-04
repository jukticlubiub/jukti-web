import "server-only";
import { sampleLogs } from "@/lib/data/logs";
import { logCategories, type LogCategory } from "@/lib/logs/types";
import type { Admin } from "../access";
import { adminDb } from "../guard";

export type AdminLog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: LogCategory;
  coverUrl: string | null;
  coverAlt: string;
  authorName: string;
  authorRole: string | null;
  authorAvatarUrl: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
};

type Row = {
  id: string; slug: string; title: string; excerpt: string; body: string; category: string; cover_url: string | null; cover_alt: string;
  author_name: string; author_role: string | null; author_avatar_url: string | null; status: "draft" | "published"; published_at: string | null; updated_at: string;
};

const toLog = (r: Row): AdminLog => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  body: r.body,
  category: (logCategories as readonly string[]).includes(r.category) ? (r.category as LogCategory) : "news",
  coverUrl: r.cover_url,
  coverAlt: r.cover_alt,
  authorName: r.author_name,
  authorRole: r.author_role,
  authorAvatarUrl: r.author_avatar_url,
  status: r.status,
  publishedAt: r.published_at,
  updatedAt: r.updated_at,
});

const fromSample = (l: (typeof sampleLogs)[number]): AdminLog => ({
  id: l.id,
  slug: l.slug,
  title: l.title,
  excerpt: l.excerpt,
  body: l.body,
  category: l.category,
  coverUrl: l.cover?.url ?? null,
  coverAlt: l.cover?.alt ?? "",
  authorName: l.author.name,
  authorRole: l.author.role,
  authorAvatarUrl: l.author.avatarUrl,
  status: "published",
  publishedAt: l.publishedAt,
  updatedAt: l.updatedAt,
});

export async function listLogsForAdmin(admin: Admin): Promise<AdminLog[]> {
  if (admin.mode === "preview") return sampleLogs.map(fromSample);
  const db = await adminDb();
  const { data, error } = await db.from("logs").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(`Couldn't load logs: ${error.message}`);
  return (data as Row[]).map(toLog);
}

export async function getLogForAdmin(admin: Admin, id: string): Promise<AdminLog | null> {
  if (admin.mode === "preview") {
    const l = sampleLogs.find((x) => x.id === id);
    return l ? fromSample(l) : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await adminDb();
  const { data } = await db.from("logs").select("*").eq("id", id).maybeSingle();
  return data ? toLog(data as Row) : null;
}
