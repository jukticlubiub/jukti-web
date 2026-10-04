import "server-only";
import { previewMemories } from "@/lib/memories/queries";
import type { MemoryRelation } from "@/lib/memories/types";
import type { Admin } from "../access";
import { adminDb } from "../guard";

export type AdminMemory = {
  id: string;
  name: string;
  relation: MemoryRelation;
  affiliation: string | null;
  message: string;
  email: string | null;
  status: "pending" | "approved" | "hidden";
  createdAt: string;
};

export async function listMemoriesForAdmin(admin: Admin): Promise<AdminMemory[]> {
  if (admin.mode === "preview") {
    return [...previewMemories()].reverse().map((m) => ({ ...m, email: null, status: "approved", createdAt: m.sharedAt }));
  }
  const db = await adminDb();
  const { data, error } = await db.rpc("admin_memories");
  if (error) throw new Error(`Couldn't load memories: ${error.message}`);
  return (data as { id: string; name: string; relation: MemoryRelation; affiliation: string | null; message: string; email: string | null; status: AdminMemory["status"]; created_at: string }[]).map((r) => ({
    id: r.id,
    name: r.name,
    relation: r.relation,
    affiliation: r.affiliation,
    message: r.message,
    email: r.email,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
};

export async function listMessages(admin: Admin): Promise<ContactMessage[]> {
  if (admin.mode === "preview") return [];
  const db = await adminDb();
  const { data, error } = await db.from("contact_messages").select("id, name, email, topic, message, status, created_at").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`Couldn't load messages: ${error.message}`);
  return (data as { id: string; name: string; email: string; topic: string; message: string; status: ContactMessage["status"]; created_at: string }[]).map((r) => ({
    ...r,
    createdAt: r.created_at,
  }));
}
