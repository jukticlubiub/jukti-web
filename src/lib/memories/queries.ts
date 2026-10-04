import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import type { Memory, MemoryRelation } from "./types";

/** Cache tag for the memories on Dr. Sabbir's page. Invalidate it after one is shared or reviewed. */
export const MEMORIES_TAG = "memories";

type Row = { id: string; name: string; relation: MemoryRelation; affiliation: string | null; message: string; created_at: string; approved_at: string | null };

/*
 * Without Supabase (development), memories are kept in the dev server's memory and shown
 * straight away, so the form can be tried out. There are no sample memories: invented
 * remembrances of a real person would be wrong.
 */
const KEY = Symbol.for("jukti.memories.preview");
const holder = globalThis as unknown as Record<symbol, Memory[] | undefined>;
export const previewMemories = () => (holder[KEY] ??= []);

/** Approved memories, newest first. */
export async function getMemories(): Promise<Memory[]> {
  "use cache";
  cacheTag(MEMORIES_TAG);
  cacheLife("hours");

  if (!supabaseEnv) return [...previewMemories()].reverse();

  const { data, error } = await createPublicClient()
    .from("sabbir_memories")
    .select("id, name, relation, affiliation, message, created_at, approved_at")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Couldn't load memories: ${error.message}`);
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    relation: r.relation,
    affiliation: r.affiliation,
    message: r.message,
    sharedAt: r.approved_at ?? r.created_at,
  }));
}
