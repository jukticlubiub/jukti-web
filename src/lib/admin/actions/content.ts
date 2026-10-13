"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { DEVELOPERS_TAG, SETTINGS_TAG, STORY_TAG, TEAM_TAG } from "@/lib/content/queries";
import { parseLinks } from "@/lib/profile-links";
import { keepImageOr } from "../remote-image";
import { type ActionState, explainDbError, failed, fieldErrors, ok, optional, slugify, str } from "../form";
import { guard } from "../guard";
import type { AdminArea } from "../roles";

/** Tables edited as ordered lists, with the area that owns them, the "shown" column and the cache tag. */
const lists = {
  team_members: { area: "team", visible: "active", tag: TEAM_TAG },
  alumni: { area: "alumni", visible: "active", tag: TEAM_TAG },
  story_chapters: { area: "story", visible: "published", tag: STORY_TAG },
  developers: { area: "developers", visible: "active", tag: DEVELOPERS_TAG },
} as const satisfies Record<string, { area: AdminArea; visible: string; tag: string }>;

type ListTable = keyof typeof lists;
const isListTable = (t: string): t is ListTable => t in lists;

const url = z.union([z.literal(null), z.url("Enter a full link, starting with https://")]);

/** Show or hide a row on the site. */
export async function setShown(previous: ActionState, fd: FormData): Promise<ActionState> {
  const table = str(fd, "table");
  if (!isListTable(table)) return failed("Unknown list.");
  const cfg = lists[table];
  const g = await guard(cfg.area);
  if (!g.ok) return g.state;
  const shown = str(fd, "shown") === "true";
  const { error } = await g.db.from(table).update({ [cfg.visible]: shown }).eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  updateTag(cfg.tag);
  return ok(previous, shown ? "Shown on the site." : "Hidden from the site.");
}

/** Lists whose entries can be deleted for good (the others can only be hidden). */
const deletable: ReadonlySet<ListTable> = new Set(["alumni"]);

const MEDIA_MARKER = "/storage/v1/object/public/media/";

/** Delete an entry for good, and its photo if it's in our storage and nothing else uses it. */
export async function deleteRow(previous: ActionState, fd: FormData): Promise<ActionState> {
  const table = str(fd, "table");
  if (!isListTable(table) || !deletable.has(table)) return failed("This list can’t be deleted from. Hide the entry instead.");
  const cfg = lists[table];
  const g = await guard(cfg.area);
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const { data } = await g.db.from(table).select("photo_url").eq("id", id).maybeSingle();
  const { error } = await g.db.from(table).delete().eq("id", id);
  if (error) return failed(explainDbError(error.message));
  const photo = (data as { photo_url: string | null } | null)?.photo_url ?? "";
  if (photo.includes(MEDIA_MARKER)) {
    const [{ count: inAlumni }, { count: inTeam }] = await Promise.all([
      g.db.from("alumni").select("id", { count: "exact", head: true }).eq("photo_url", photo),
      g.db.from("team_members").select("id", { count: "exact", head: true }).eq("photo_url", photo),
    ]);
    if (!inAlumni && !inTeam) await g.db.storage.from("media").remove([photo.split(MEDIA_MARKER)[1]]);
  }
  updateTag(cfg.tag);
  return ok(previous, "Deleted.");
}

/**
 * Save a list's new order (dragged into place): `ids` is every row of the list (within `kind`
 * for the team and alumni) in its new order. Refused if it doesn't match the list as saved,
 * e.g. someone else added or deleted a row meanwhile.
 */
export async function reorderRows(previous: ActionState, fd: FormData): Promise<ActionState> {
  const table = str(fd, "table");
  if (!isListTable(table)) return failed("Unknown list.");
  const cfg = lists[table];
  const g = await guard(cfg.area);
  if (!g.ok) return g.state;
  let ids: unknown;
  try {
    ids = JSON.parse(str(fd, "ids"));
  } catch {
    return failed("The new order couldn’t be read.");
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return failed("The new order couldn’t be read.");
  let q = g.db.from(table).select("id, position").order("position");
  if (table === "team_members" || (table === "alumni" && str(fd, "kind"))) q = q.eq("kind", str(fd, "kind"));
  const { data, error } = await q;
  if (error) return failed(explainDbError(error.message));
  const list = (data as { id: string; position: number }[] | null) ?? [];
  const saved = new Map(list.map((r) => [r.id, r.position]));
  if (ids.length !== list.length || new Set(ids).size !== ids.length || !ids.every((id) => saved.has(id))) {
    return failed("The list changed meanwhile. Reload the page and try again.");
  }
  for (const [position, id] of (ids as string[]).entries()) {
    if (saved.get(id) === position) continue;
    const { error: updateError } = await g.db.from(table).update({ position }).eq("id", id);
    if (updateError) return failed(explainDbError(updateError.message));
  }
  updateTag(cfg.tag);
  return ok(previous, "Order saved.");
}

async function nextPosition(db: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSessionClient>>, table: ListTable, kind?: string) {
  let q = db.from(table).select("position").order("position", { ascending: false }).limit(1);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (((data as { position: number }[] | null)?.[0]?.position ?? -1) as number) + 1;
}

/* ---------- Team & alumni (Team Manager) ---------- */

const memberSchema = z.object({
  kind: z.enum(["advisor", "executive"]),
  name: z.string().min(1, "Enter a name.").max(80),
  role: z.string().max(80),
  photoUrl: z.string().nullable(),
  linkedin: url,
});

export async function saveTeamMember(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("team");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = memberSchema.safeParse({ kind: str(fd, "kind"), name: str(fd, "name"), role: str(fd, "role"), photoUrl: optional(fd, "photoUrl"), linkedin: optional(fd, "linkedin") });
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const m = parsed.data;
  const photo = await keepImageOr(g.db, m.photoUrl, "team");
  if ("error" in photo) return failed(photo.error, { photoUrl: photo.error });
  const row = { kind: m.kind, name: m.name, role: m.role, photo_url: photo.url, linkedin: m.linkedin };
  const { error } = id
    ? await g.db.from("team_members").update(row).eq("id", id)
    : await g.db.from("team_members").insert({ ...row, position: await nextPosition(g.db, "team_members", m.kind) });
  if (error) return failed(explainDbError(error.message));
  updateTag(TEAM_TAG);
  return ok(previous, id ? "Saved." : `Added ${m.name}.`);
}

const MAX_LINKS = 8;

const alumnusSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(80),
  role: z.string().max(80),
  term: z.string().max(20),
  photoUrl: z.string().nullable(),
  email: z.union([z.literal(null), z.email("Enter an email address, like name@example.com.").max(254)]),
});

/** An alumnus or former advisor: name, role or designation, years, photo, email and profile links. */
export async function saveAlumnus(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("alumni");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = alumnusSchema.safeParse({ name: str(fd, "name"), role: str(fd, "role"), term: str(fd, "term"), photoUrl: optional(fd, "photoUrl"), email: optional(fd, "email") });
  const { links, invalid } = parseLinks(String(fd.get("links") ?? ""));
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
  if (invalid) errors.links = `“${invalid}” isn’t a web link. Put one full link on each line.`;
  else if (links.length > MAX_LINKS) errors.links = `Up to ${MAX_LINKS} links.`;
  if (!parsed.success || Object.keys(errors).length) return failed("Check the highlighted fields.", errors);
  const a = parsed.data;
  const kind = str(fd, "kind") === "former_advisor" ? "former_advisor" : "alumnus";
  const photo = await keepImageOr(g.db, a.photoUrl, "alumni");
  if ("error" in photo) return failed(photo.error, { photoUrl: photo.error });
  // The old single LinkedIn field now lives in `links`.
  const row = { name: a.name, role: a.role, term: a.term, photo_url: photo.url, email: a.email?.toLowerCase() ?? null, links, linkedin: null };
  const { error } = id
    ? await g.db.from("alumni").update(row).eq("id", id)
    : await g.db.from("alumni").insert({ ...row, kind, position: await nextPosition(g.db, "alumni", kind) });
  if (error) return failed(explainDbError(error.message));
  updateTag(TEAM_TAG);
  return ok(previous, id ? "Saved." : `Added ${a.name}.`);
}

export async function saveBoardTerm(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("team");
  if (!g.ok) return g.state;
  const term = str(fd, "term");
  if (!/^\d{4}(-\d{2,4})?$/.test(term)) return failed("Write the term like 2026-27.", { term: "e.g. 2026-27" });
  const { error } = await g.db.from("site_settings").upsert({ key: "team.board_term", value: term });
  if (error) return failed(explainDbError(error.message));
  updateTag(SETTINGS_TAG);
  updateTag(TEAM_TAG);
  return ok(previous, "Board term saved.");
}

/* ---------- About story (PR Editor) ---------- */

const chapterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
  kicker: z.string().max(40),
  title: z.string().min(1, "Give the chapter a title.").max(140),
  body: z.string().max(1500, "Keep it to a short paragraph."),
  badge: z.string().max(40),
  photoHint: z.string().max(120),
  photoUrl: z.string().nullable(),
  photoAlt: z.string().max(200),
  linkHref: z.string().nullable(),
  linkLabel: z.string().max(60).nullable(),
});

export async function saveChapter(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("story");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = chapterSchema.safeParse({
    slug: str(fd, "slug") || slugify(str(fd, "title")),
    kicker: str(fd, "kicker"),
    title: str(fd, "title"),
    body: str(fd, "body"),
    badge: str(fd, "badge"),
    photoHint: str(fd, "photoHint"),
    photoUrl: optional(fd, "photoUrl"),
    photoAlt: str(fd, "photoAlt"),
    linkHref: optional(fd, "linkHref"),
    linkLabel: optional(fd, "linkLabel"),
  });
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const c = parsed.data;
  if (c.photoUrl && !c.photoAlt) return failed("Describe the photo.", { photoAlt: "Describe the photo." });
  const photo = await keepImageOr(g.db, c.photoUrl, "story");
  if ("error" in photo) return failed(photo.error, { photoUrl: photo.error });
  const row = {
    slug: c.slug, kicker: c.kicker, title: c.title, body: c.body, badge: c.badge, photo_hint: c.photoHint, photo_url: photo.url, photo_alt: c.photoAlt, link_href: c.linkHref, link_label: c.linkLabel,
  };
  const { error } = id ? await g.db.from("story_chapters").update(row).eq("id", id) : await g.db.from("story_chapters").insert({ ...row, position: await nextPosition(g.db, "story_chapters") });
  if (error) return failed(error.message.includes("duplicate key") ? "Another chapter uses that id." : explainDbError(error.message));
  updateTag(STORY_TAG);
  return ok(previous, id ? "Chapter saved." : "Chapter added.");
}

/* ---------- Developers (Master Admin) ---------- */

const socialKeys = ["linkedin", "github", "facebook", "instagram", "website", "email"] as const;

export async function saveDeveloper(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("developers");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return failed("Enter a name.", { name: "Enter a name." });
  const socials = Object.fromEntries(socialKeys.map((k) => [k, str(fd, `social_${k}`)]).filter(([, v]) => v));
  for (const [k, v] of Object.entries(socials)) {
    const valid = k === "email" ? z.email().safeParse(v).success : z.url().safeParse(v).success;
    if (!valid) return failed(`Check the ${k} link.`, { [`social_${k}`]: k === "email" ? "Enter an email address." : "Enter a full link, starting with https://" });
  }
  const photo = await keepImageOr(g.db, optional(fd, "photoUrl"), "developers");
  if ("error" in photo) return failed(photo.error, { photoUrl: photo.error });
  const row = { name, role: str(fd, "role"), designation: str(fd, "designation"), photo_url: photo.url, socials };
  const { error } = id ? await g.db.from("developers").update(row).eq("id", id) : await g.db.from("developers").insert({ ...row, position: await nextPosition(g.db, "developers") });
  if (error) return failed(explainDbError(error.message));
  updateTag(DEVELOPERS_TAG);
  return ok(previous, id ? "Saved." : `Added ${name}.`);
}

/* ---------- Site settings and the memorial page (Master Admin) ---------- */

export async function saveSocials(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("settings");
  if (!g.ok) return g.state;
  const value = { facebook: str(fd, "facebook"), instagram: str(fd, "instagram"), linkedin: str(fd, "linkedin"), email: str(fd, "email") };
  const errors: Record<string, string> = {};
  for (const k of ["facebook", "instagram", "linkedin"] as const) if (value[k] && !z.url().safeParse(value[k]).success) errors[k] = "Enter a full link, starting with https://";
  if (value.email && !z.email().safeParse(value.email).success) errors.email = "Enter an email address.";
  if (Object.keys(errors).length) return failed("Check the highlighted fields.", errors);
  const { error } = await g.db.from("site_settings").upsert({ key: "socials", value });
  if (error) return failed(explainDbError(error.message));
  updateTag(SETTINGS_TAG);
  return ok(previous, "Social links saved.");
}

export async function saveMemorial(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("memorial");
  if (!g.ok) return g.state;
  const lines = (key: string) => String(fd.get(key) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const tribute = String(fd.get("tribute") ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (tribute.length === 0) return failed("The tribute can’t be empty.", { tribute: "Write the tribute." });
  const life = lines("life").map((l) => {
    const [year = "", title = "", ...detail] = l.split("|").map((s) => s.trim());
    return { year, title, detail: detail.join(" | ") };
  });
  if (life.some((e) => !e.year || !e.title)) return failed("Each timeline line needs a year and a title.", { life: "year | title | detail" });
  let photos: { src: string; alt: string; width: number; height: number }[];
  try {
    photos = z.array(z.object({ src: z.string().min(1), alt: z.string(), width: z.number(), height: z.number() })).parse(JSON.parse(String(fd.get("photos") ?? "[]")));
  } catch {
    return failed("The photo list couldn’t be read.");
  }
  if (photos.some((p) => !p.alt.trim())) return failed("Describe every photo.", { photos: "Each photo needs a description." });
  const value = { tribute, farewell: str(fd, "farewell"), notice: str(fd, "notice"), life, interests: lines("interests"), photos };
  const { error } = await g.db.from("site_settings").upsert({ key: "memorial", value });
  if (error) return failed(explainDbError(error.message));
  updateTag(SETTINGS_TAG);
  return ok(previous, "Memorial page saved.");
}

