"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LOGS_TAG } from "@/lib/logs/queries";
import { logCategories } from "@/lib/logs/types";
import { type ActionState, explainDbError, failed, fieldErrors, fromDhakaInput, ok, optional, slugify, str } from "../form";
import { guard } from "../guard";
import { keepImageOr } from "../remote-image";

const schema = z.object({
  title: z.string().min(1, "Give the log a title.").max(160),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
  excerpt: z.string().max(300, "Keep the excerpt to a sentence or two."),
  body: z.string().max(100000),
  category: z.enum(logCategories),
  coverUrl: z.string().nullable(),
  coverAlt: z.string().max(200),
  authorName: z.string().min(1, "Who wrote it? (e.g. JUKTI Tech Team)").max(80),
  authorRole: z.string().max(80).nullable(),
  authorAvatarUrl: z.string().nullable(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().nullable(),
});

export async function saveLog(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("logs");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = schema.safeParse({
    title: str(fd, "title"),
    slug: str(fd, "slug") || slugify(str(fd, "title")),
    excerpt: str(fd, "excerpt"),
    body: String(fd.get("body") ?? ""),
    category: str(fd, "category"),
    coverUrl: optional(fd, "coverUrl"),
    coverAlt: str(fd, "coverAlt"),
    authorName: str(fd, "authorName"),
    authorRole: optional(fd, "authorRole"),
    authorAvatarUrl: optional(fd, "authorAvatarUrl"),
    status: str(fd, "status"),
    publishedAt: fromDhakaInput(str(fd, "publishedAt")),
  });
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const l = parsed.data;
  if (l.status === "published" && !l.excerpt) return failed("Add an excerpt before publishing: it’s shown on cards and in link previews.", { excerpt: "Required to publish." });
  if (l.coverUrl && !l.coverAlt) return failed("Describe the cover image.", { coverAlt: "Describe the image." });
  const cover = await keepImageOr(g.db, l.coverUrl, "logs");
  if ("error" in cover) return failed(cover.error, { coverUrl: cover.error });
  const avatar = await keepImageOr(g.db, l.authorAvatarUrl, "logs/authors");
  if ("error" in avatar) return failed(avatar.error, { authorAvatarUrl: avatar.error });

  const row = {
    title: l.title,
    slug: l.slug,
    excerpt: l.excerpt,
    body: l.body,
    category: l.category,
    cover_url: cover.url,
    cover_alt: l.coverAlt,
    author_name: l.authorName,
    author_role: l.authorRole,
    author_avatar_url: avatar.url,
    status: l.status,
    published_at: l.publishedAt,
  };
  const res = id ? await g.db.from("logs").update(row).eq("id", id).select("id").single() : await g.db.from("logs").insert(row).select("id").single();
  if (res.error) {
    if (res.error.message.includes("duplicate key")) return failed("Another log already uses that web address.", { slug: "Choose a different one." });
    return failed(explainDbError(res.error.message));
  }
  updateTag(LOGS_TAG);
  return ok(previous, l.status === "published" ? "Saved and published." : "Draft saved.", res.data.id);
}

export async function deleteLog(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("logs");
  if (!g.ok) return g.state;
  // Only drafts can be deleted; published logs are unpublished instead.
  const { data, error } = await g.db.from("logs").delete().eq("id", str(fd, "id")).eq("status", "draft").select("id");
  if (error) return failed(explainDbError(error.message));
  if (!data?.length) return failed("Only drafts can be deleted. Unpublish it first.");
  updateTag(LOGS_TAG);
  redirect("/admin/logs");
}
