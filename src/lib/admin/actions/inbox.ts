"use server";

import { refresh, updateTag } from "next/cache";
import { MEMORIES_TAG } from "@/lib/memories/queries";
import { type ActionState, explainDbError, failed, ok, str } from "../form";
import { guard } from "../guard";

export async function setMemoryStatus(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("memories");
  if (!g.ok) return g.state;
  const status = str(fd, "status");
  if (!["pending", "approved", "hidden"].includes(status)) return failed("Unknown status.");
  const { error } = await g.db
    .from("sabbir_memories")
    .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  updateTag(MEMORIES_TAG);
  return ok(previous, status === "approved" ? "Approved: it’s on the memorial page now." : "Updated.");
}

export async function setMessageStatus(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("messages");
  if (!g.ok) return g.state;
  const status = str(fd, "status");
  if (!["new", "read", "replied", "archived"].includes(status)) return failed("Unknown status.");
  const { error } = await g.db.from("contact_messages").update({ status }).eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, "Updated.");
}
