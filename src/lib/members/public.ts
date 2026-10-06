import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { intakeLabel } from "./semester";

/** Cache tag for the public members list. Invalidate after a member is approved or edits their profile. */
export const MEMBERS_TAG = "members";

export type PublicMember = { name: string; department: string; intake: string | null; photoUrl: string | null };

/** "Cse", "Computer Science and Engineering (CSE)" → "CSE"; registration was free text. */
export function tidyDepartment(raw: string | null) {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  if (!text) return "";
  if (/^(cse|cs|csc|computer science( and)?( engineering)?( \(cse\))?)$/.test(lower)) return "CSE";
  if (/^eee$/.test(lower)) return "EEE";
  if (/\bbba\b/.test(lower)) return "BBA";
  if (text.length <= 4) return text.toUpperCase();
  return text.replace(/\b([a-z])([a-z]*)/g, (word, first: string, rest: string) => (/^(and|of|in|&)$/.test(word) ? word : first.toUpperCase() + rest));
}

/** Every approved member who hasn't hidden themselves: name, department, intake and photo only. */
export async function getPublicMembers(): Promise<PublicMember[]> {
  "use cache";
  cacheTag(MEMBERS_TAG);
  cacheLife("hours");
  if (!supabaseEnv) return [];
  const { data, error } = await createPublicClient().rpc("public_members");
  if (error) throw new Error(`Couldn't load members: ${error.message}`);
  return (data as { name: string; department: string | null; intake: string | null; photo_url: string | null }[]).map((m) => ({
    name: m.name,
    department: tidyDepartment(m.department),
    intake: intakeLabel(m.intake),
    photoUrl: m.photo_url,
  }));
}
