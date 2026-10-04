import "server-only";
import { sampleFaculty } from "@/lib/data/faculty";
import { sampleAnswers, sampleQuestions } from "@/lib/data/helpline";
import type { Admin } from "../access";
import { adminDb } from "../guard";

export type AdminQuestion = {
  id: string;
  title: string;
  body: string;
  topic: string;
  course: string | null;
  askerName: string;
  askerEmail: string | null;
  anonymous: boolean;
  status: "visible" | "hidden";
  createdAt: string;
  answers: number;
};

export async function listQuestionsForAdmin(admin: Admin): Promise<AdminQuestion[]> {
  if (admin.mode === "preview") {
    return sampleQuestions.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      topic: q.topic,
      course: q.course,
      askerName: q.askerName ?? "Anonymous student",
      askerEmail: null,
      anonymous: q.askerName === null,
      status: "visible",
      createdAt: q.createdAt,
      answers: sampleAnswers.filter((a) => a.questionId === q.id).length,
    }));
  }
  const db = await adminDb();
  const { data, error } = await db.rpc("admin_helpline_questions");
  if (error) throw new Error(`Couldn't load questions: ${error.message}`);
  return (data as { id: string; title: string; body: string; topic: string; course: string | null; asker_name: string; asker_email: string; anonymous: boolean; status: "visible" | "hidden"; created_at: string; answers: number }[]).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    topic: r.topic,
    course: r.course,
    askerName: r.asker_name,
    askerEmail: r.asker_email,
    anonymous: r.anonymous,
    status: r.status,
    createdAt: r.created_at,
    answers: r.answers,
  }));
}

export type AdminFaculty = {
  id: string;
  name: string;
  designation: string;
  room: string | null;
  email: string;
  loginEmail: string | null;
  position: number;
  active: boolean;
  notify: boolean;
};

export async function listFacultyForAdmin(admin: Admin): Promise<AdminFaculty[]> {
  if (admin.mode === "preview") return sampleFaculty.map((f) => ({ ...f, loginEmail: null, active: true, notify: true }));
  const db = await adminDb();
  const { data, error } = await db.from("faculty").select("id, name, designation, room, email, login_email, position, active, notify").order("position").order("name");
  if (error) throw new Error(`Couldn't load faculty: ${error.message}`);
  return (data as { id: string; name: string; designation: string; room: string | null; email: string; login_email: string | null; position: number; active: boolean; notify: boolean }[]).map((r) => ({
    id: r.id,
    name: r.name,
    designation: r.designation,
    room: r.room,
    email: r.email,
    loginEmail: r.login_email,
    position: r.position,
    active: r.active,
    notify: r.notify,
  }));
}

export type Senior = { email: string; name: string; createdAt: string };

export async function listSeniors(admin: Admin): Promise<Senior[]> {
  if (admin.mode === "preview") return [];
  const db = await adminDb();
  const { data, error } = await db.from("helpline_seniors").select("email, name, created_at").order("name");
  if (error) throw new Error(`Couldn't load seniors: ${error.message}`);
  return (data as { email: string; name: string; created_at: string }[]).map((r) => ({ email: r.email, name: r.name, createdAt: r.created_at }));
}
