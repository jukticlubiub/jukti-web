"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { FACULTY_TAG, HELPLINE_TAG } from "@/lib/helpline/queries";
import { type ActionState, bool, explainDbError, failed, fieldErrors, ok, optional, str } from "../form";
import { guard } from "../guard";

export async function setQuestionStatus(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("helpline");
  if (!g.ok) return g.state;
  const status = str(fd, "status") === "hidden" ? "hidden" : "visible";
  const { error } = await g.db.from("helpline_questions").update({ status }).eq("id", str(fd, "id"));
  if (error) return failed(explainDbError(error.message));
  updateTag(HELPLINE_TAG);
  return ok(previous, status === "hidden" ? "Hidden from the board." : "Back on the board.");
}

const facultySchema = z.object({
  name: z.string().min(2, "Enter their name.").max(120),
  designation: z.string().max(160),
  room: z.string().max(40).nullable(),
  email: z.email("Enter their IUB email."),
  loginEmail: z.union([z.literal(null), z.email("Enter a valid email, or leave it empty.")]),
  position: z.number().int().min(0),
  active: z.boolean(),
  notify: z.boolean(),
});

export async function saveFaculty(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("faculty");
  if (!g.ok) return g.state;
  const id = str(fd, "id");
  const parsed = facultySchema.safeParse({
    name: str(fd, "name"),
    designation: str(fd, "designation"),
    room: optional(fd, "room"),
    email: str(fd, "email").toLowerCase(),
    loginEmail: optional(fd, "loginEmail")?.toLowerCase() ?? null,
    position: Number(str(fd, "position") || 0),
    active: bool(fd, "active"),
    notify: bool(fd, "notify"),
  });
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrors(parsed.error));
  const f = parsed.data;
  const row = { name: f.name, designation: f.designation, room: f.room, email: f.email, login_email: f.loginEmail, position: f.position, active: f.active, notify: f.notify };
  const { error } = id ? await g.db.from("faculty").update(row).eq("id", id) : await g.db.from("faculty").insert(row);
  if (error) return failed(error.message.includes("duplicate key") ? "Someone in the directory already has that email." : explainDbError(error.message));
  updateTag(FACULTY_TAG);
  refresh();
  return ok(previous, id ? "Saved." : `Added ${f.name}.`);
}

const seniorSchema = z.object({ email: z.email("Enter their Google email."), name: z.string().min(2, "Enter their name.").max(80) });

export async function addSenior(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("seniors");
  if (!g.ok) return g.state;
  const parsed = seniorSchema.safeParse({ email: str(fd, "email").toLowerCase(), name: str(fd, "name") });
  if (!parsed.success) return failed("Check the form.", fieldErrors(parsed.error));
  const { error } = await g.db.from("helpline_seniors").upsert({ email: parsed.data.email, name: parsed.data.name });
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, `${parsed.data.name} can now answer helpline questions.`);
}

export async function removeSenior(previous: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard("seniors");
  if (!g.ok) return g.state;
  const { error } = await g.db.from("helpline_seniors").delete().eq("email", str(fd, "email"));
  if (error) return failed(explainDbError(error.message));
  refresh();
  return ok(previous, "Removed.");
}
