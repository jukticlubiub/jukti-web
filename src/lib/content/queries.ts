import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { type Alumnus, alumni as fileAlumni } from "@/lib/data/alumni";
import { type Developer, developers as fileDevelopers } from "@/lib/data/developers";
import * as fileMemorial from "@/lib/data/sabbir";
import { type StoryChapter, storyChapters as fileStory } from "@/lib/data/story";
import { boardTerm as fileBoardTerm, type TeamMember, teamMembers as fileTeam } from "@/lib/data/team";
import { site } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

/*
 * Content managed in the admin panel: the team, alumni, the About story, the
 * developers page, the memorial page's text and the club's social links.
 * Without Supabase the files in src/lib/data/ are used (they also seed the database).
 */

export const TEAM_TAG = "team";
export const STORY_TAG = "story";
export const DEVELOPERS_TAG = "developers";
export const SETTINGS_TAG = "settings";

async function setting<T>(key: string): Promise<T | null> {
  const { data } = await createPublicClient().from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data as { value: T } | null)?.value ?? null;
}

export async function getTeam(): Promise<{ members: TeamMember[]; boardTerm: string }> {
  "use cache";
  cacheTag(TEAM_TAG, SETTINGS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return { members: fileTeam, boardTerm: fileBoardTerm };
  const [{ data, error }, term] = await Promise.all([
    createPublicClient().from("team_members").select("id, kind, name, role, photo_url, linkedin").eq("active", true).order("kind").order("position"),
    setting<string>("team.board_term"),
  ]);
  if (error) throw new Error(`Couldn't load the team: ${error.message}`);
  const rows = data as { id: string; kind: TeamMember["kind"]; name: string; role: string; photo_url: string | null; linkedin: string | null }[];
  return {
    // Advisors first, then the executive panel.
    members: rows
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "advisor" ? -1 : 1))
      .map((r) => ({ id: r.id, kind: r.kind, name: r.name, role: r.role, photo: r.photo_url ?? undefined, linkedin: r.linkedin ?? undefined })),
    boardTerm: term ?? fileBoardTerm,
  };
}

export async function getAlumni(): Promise<Alumnus[]> {
  "use cache";
  cacheTag(TEAM_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return fileAlumni;
  const { data, error } = await createPublicClient().from("alumni").select("id, name, role, term, photo_url, linkedin, email, links, kind").eq("active", true).order("position");
  if (error) throw new Error(`Couldn't load alumni: ${error.message}`);
  type Row = { id: string; name: string; role: string; term: string; photo_url: string | null; linkedin: string | null; email: string | null; links: string[]; kind: "alumnus" | "former_advisor" };
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    term: r.term,
    photo: r.photo_url ?? undefined,
    email: r.email ?? undefined,
    // Entries saved before links existed may still have just a LinkedIn.
    links: [...new Set([...(r.linkedin ? [r.linkedin] : []), ...r.links])],
    kind: r.kind,
  }));
}

export async function getStoryChapters(): Promise<StoryChapter[]> {
  "use cache";
  cacheTag(STORY_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return fileStory;
  const { data, error } = await createPublicClient()
    .from("story_chapters")
    .select("slug, kicker, title, body, badge, photo_hint, photo_url, photo_alt, link_href, link_label")
    .eq("published", true)
    .order("position");
  if (error) throw new Error(`Couldn't load the story: ${error.message}`);
  return (data as { slug: string; kicker: string; title: string; body: string; badge: string; photo_hint: string; photo_url: string | null; photo_alt: string; link_href: string | null; link_label: string | null }[]).map((r) => ({
    id: r.slug,
    kicker: r.kicker,
    title: r.title,
    body: r.body,
    badge: r.badge,
    photoHint: r.photo_hint,
    photo: r.photo_url ? { src: r.photo_url, alt: r.photo_alt } : undefined,
    link: r.link_href ? { href: r.link_href, label: r.link_label ?? "Read more" } : undefined,
  }));
}

export async function getDevelopers(): Promise<Developer[]> {
  "use cache";
  cacheTag(DEVELOPERS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return fileDevelopers;
  const { data, error } = await createPublicClient().from("developers").select("id, name, role, designation, photo_url, socials").eq("active", true).order("position");
  if (error) throw new Error(`Couldn't load developers: ${error.message}`);
  return (data as { id: string; name: string; role: string; designation: string; photo_url: string | null; socials: Developer["socials"] }[]).map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    designation: r.designation,
    photo: r.photo_url ?? "",
    socials: r.socials ?? {},
  }));
}

export type Socials = { facebook: string; instagram: string; linkedin: string; email: string };

/** The club's social links, as edited in Settings (the defaults are in lib/site.ts). */
export async function getSocials(): Promise<Socials> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  const defaults: Socials = { ...site.socials };
  if (!supabaseEnv) return defaults;
  const saved = await setting<Partial<Socials>>("socials");
  return { ...defaults, ...Object.fromEntries(Object.entries(saved ?? {}).filter(([, v]) => typeof v === "string" && v)) };
}

/** Whether students can register on /join. Open unless closed in Admin > Members. */
export async function getRegistrationOpen(): Promise<boolean> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return true;
  const saved = await setting<{ open?: boolean }>("members.registration");
  return saved?.open !== false;
}

/** Whether registering asks for the code an executive gives after payment (on unless switched off in Admin > Members). */
export async function getExecutiveCodeRequired(): Promise<boolean> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return true;
  const saved = await setting<{ required?: boolean }>("members.verification");
  return saved?.required !== false;
}

export type MemorialContent = {
  tribute: string[];
  farewell: string;
  notice: string;
  life: fileMemorial.LifeEvent[];
  interests: string[];
  photos: fileMemorial.Photo[];
};

export const memorialDefaults: MemorialContent = {
  tribute: fileMemorial.tributes.long,
  farewell: fileMemorial.tributes.farewell,
  notice: fileMemorial.tributes.notice,
  life: fileMemorial.life,
  interests: fileMemorial.interests,
  photos: fileMemorial.photos,
};

/** The memorial page's editable text, timeline and photos (Master Admin). */
export async function getMemorial(): Promise<MemorialContent> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return memorialDefaults;
  const saved = await setting<Partial<MemorialContent>>("memorial");
  return { ...memorialDefaults, ...(saved ?? {}) };
}
