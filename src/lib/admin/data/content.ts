import "server-only";
import { alumni as fileAlumni } from "@/lib/data/alumni";
import { developers as fileDevelopers } from "@/lib/data/developers";
import { storyChapters as fileStory } from "@/lib/data/story";
import { teamMembers as fileTeam } from "@/lib/data/team";
import type { Admin } from "../access";
import { adminDb } from "../guard";

export type AdminTeamMember = { id: string; kind: "advisor" | "executive"; name: string; role: string; photoUrl: string | null; linkedin: string | null; position: number; active: boolean };
export type AdminAlumnus = { id: string; name: string; role: string; term: string; photoUrl: string | null; linkedin: string | null; position: number; active: boolean; kind: "alumnus" | "former_advisor" };
export type AdminChapter = {
  id: string; slug: string; kicker: string; title: string; body: string; badge: string; photoHint: string; photoUrl: string | null; photoAlt: string;
  linkHref: string | null; linkLabel: string | null; position: number; published: boolean;
};
export type AdminDeveloper = { id: string; name: string; role: string; designation: string; photoUrl: string | null; socials: Record<string, string>; position: number; active: boolean };

export async function listTeamForAdmin(admin: Admin): Promise<AdminTeamMember[]> {
  if (admin.mode === "preview") return fileTeam.map((m, i) => ({ id: m.id, kind: m.kind, name: m.name, role: m.role, photoUrl: m.photo ?? null, linkedin: m.linkedin ?? null, position: i, active: true }));
  const { data, error } = await (await adminDb()).from("team_members").select("id, kind, name, role, photo_url, linkedin, position, active").order("kind").order("position");
  if (error) throw new Error(error.message);
  return (data as { id: string; kind: "advisor" | "executive"; name: string; role: string; photo_url: string | null; linkedin: string | null; position: number; active: boolean }[]).map((r) => ({
    id: r.id, kind: r.kind, name: r.name, role: r.role, photoUrl: r.photo_url, linkedin: r.linkedin, position: r.position, active: r.active,
  }));
}

export async function listAlumniForAdmin(admin: Admin): Promise<AdminAlumnus[]> {
  if (admin.mode === "preview") return fileAlumni.map((a, i) => ({ id: a.id, name: a.name, role: a.role, term: a.term, photoUrl: a.photo ?? null, linkedin: a.linkedin ?? null, position: i, active: true, kind: a.kind ?? "alumnus" }));
  const { data, error } = await (await adminDb()).from("alumni").select("id, name, role, term, photo_url, linkedin, position, active, kind").order("position");
  if (error) throw new Error(error.message);
  return (data as { id: string; name: string; role: string; term: string; photo_url: string | null; linkedin: string | null; position: number; active: boolean; kind: "alumnus" | "former_advisor" }[]).map((r) => ({
    id: r.id, name: r.name, role: r.role, term: r.term, photoUrl: r.photo_url, linkedin: r.linkedin, position: r.position, active: r.active, kind: r.kind,
  }));
}

export async function listStoryForAdmin(admin: Admin): Promise<AdminChapter[]> {
  if (admin.mode === "preview") {
    return fileStory.map((c, i) => ({
      id: c.id, slug: c.id, kicker: c.kicker, title: c.title, body: c.body, badge: c.badge, photoHint: c.photoHint, photoUrl: c.photo?.src ?? null, photoAlt: c.photo?.alt ?? "",
      linkHref: c.link?.href ?? null, linkLabel: c.link?.label ?? null, position: i, published: true,
    }));
  }
  const { data, error } = await (await adminDb()).from("story_chapters").select("*").order("position");
  if (error) throw new Error(error.message);
  return (data as { id: string; slug: string; kicker: string; title: string; body: string; badge: string; photo_hint: string; photo_url: string | null; photo_alt: string; link_href: string | null; link_label: string | null; position: number; published: boolean }[]).map((r) => ({
    id: r.id, slug: r.slug, kicker: r.kicker, title: r.title, body: r.body, badge: r.badge, photoHint: r.photo_hint, photoUrl: r.photo_url, photoAlt: r.photo_alt,
    linkHref: r.link_href, linkLabel: r.link_label, position: r.position, published: r.published,
  }));
}

export async function listDevelopersForAdmin(admin: Admin): Promise<AdminDeveloper[]> {
  if (admin.mode === "preview") {
    return fileDevelopers.map((d, i) => ({ id: d.id, name: d.name, role: d.role, designation: d.designation, photoUrl: d.photo, socials: Object.fromEntries(Object.entries(d.socials).filter(([, v]) => v)) as Record<string, string>, position: i, active: true }));
  }
  const { data, error } = await (await adminDb()).from("developers").select("id, name, role, designation, photo_url, socials, position, active").order("position");
  if (error) throw new Error(error.message);
  return (data as { id: string; name: string; role: string; designation: string; photo_url: string | null; socials: Record<string, string>; position: number; active: boolean }[]).map((r) => ({
    id: r.id, name: r.name, role: r.role, designation: r.designation, photoUrl: r.photo_url, socials: r.socials ?? {}, position: r.position, active: r.active,
  }));
}
