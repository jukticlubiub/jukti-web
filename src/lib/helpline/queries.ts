import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sampleFaculty } from "@/lib/data/faculty";
import { supabaseEnv } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { previewAnswers, previewQuestion, previewQuestions } from "./preview";
import { type Faculty, type HelplineAnswer, type HelplineQuestion, type HelplineRole, helplineTopics, type HelplineTopic } from "./types";

/** Cache tags. Invalidate HELPLINE_TAG after any question or answer changes, FACULTY_TAG after directory edits. */
export const HELPLINE_TAG = "helpline";
export const FACULTY_TAG = "faculty";

/** The board shows the newest questions, up to this many. */
const BOARD_LIMIT = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type QuestionRow = {
  id: string;
  title: string;
  body: string;
  topic: string;
  course: string | null;
  display_name: string | null;
  created_at: string;
};

type AnswerRow = {
  id: string;
  question_id: string;
  author_name: string;
  author_role: HelplineRole;
  body: string;
  created_at: string;
};

type FacultyRow = {
  id: string;
  name: string;
  designation: string;
  room: string | null;
  email: string;
  photo_url: string | null;
  position: number;
};

// Only the public columns: asker emails and user ids aren't readable anyway (column grants).
// Answer counts come from a second query: PostgREST's embedded `(count)` needs a table-wide
// SELECT grant, which helpline_answers deliberately doesn't have.
const QUESTION_COLUMNS = "id, title, body, topic, course, display_name, created_at";

/** How many visible answers each question has (RLS hides the rest). */
async function answerCounts(questionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const db = createPublicClient();
  // In batches, so the ids fit in the request URL.
  for (let i = 0; i < questionIds.length; i += 80) {
    const { data, error } = await db.from("helpline_answers").select("question_id").in("question_id", questionIds.slice(i, i + 80));
    if (error) throw new Error(`Couldn't count the answers: ${error.message}`);
    for (const { question_id } of data as { question_id: string }[]) counts.set(question_id, (counts.get(question_id) ?? 0) + 1);
  }
  return counts;
}

function toQuestion(row: QuestionRow, answerCount: number): HelplineQuestion {
  const topic = (helplineTopics as readonly string[]).includes(row.topic) ? (row.topic as HelplineTopic) : "other";
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    topic,
    course: row.course,
    askerName: row.display_name,
    createdAt: row.created_at,
    answerCount,
  };
}

/** The newest questions on the board, with how many answers each has. */
export async function getQuestions(): Promise<HelplineQuestion[]> {
  "use cache";
  cacheTag(HELPLINE_TAG);
  cacheLife("minutes");

  if (!supabaseEnv) return previewQuestions();

  const { data, error } = await createPublicClient()
    .from("helpline_questions")
    .select(QUESTION_COLUMNS)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(BOARD_LIMIT);
  if (error) throw new Error(`Couldn't load helpline questions: ${error.message}`);
  const rows = data as QuestionRow[];
  const counts = await answerCounts(rows.map((r) => r.id));
  return rows.map((r) => toQuestion(r, counts.get(r.id) ?? 0));
}

export async function getQuestion(id: string): Promise<HelplineQuestion | null> {
  "use cache";
  cacheTag(HELPLINE_TAG);
  cacheLife("minutes");

  if (!supabaseEnv) return previewQuestion(id);
  if (!UUID.test(id)) return null;

  const { data, error } = await createPublicClient()
    .from("helpline_questions")
    .select(QUESTION_COLUMNS)
    .eq("id", id)
    .eq("status", "visible")
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the question: ${error.message}`);
  if (!data) return null;
  const row = data as QuestionRow;
  return toQuestion(row, (await answerCounts([row.id])).get(row.id) ?? 0);
}

/** A question's answers, oldest first. */
export async function getAnswers(questionId: string): Promise<HelplineAnswer[]> {
  "use cache";
  cacheTag(HELPLINE_TAG);
  cacheLife("minutes");

  if (!supabaseEnv) return previewAnswers(questionId);
  if (!UUID.test(questionId)) return [];

  const { data, error } = await createPublicClient()
    .from("helpline_answers")
    .select("id, question_id, author_name, author_role, body, created_at")
    .eq("question_id", questionId)
    .eq("status", "visible")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Couldn't load the answers: ${error.message}`);
  return (data as AnswerRow[]).map((row) => ({
    id: row.id,
    questionId: row.question_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
  }));
}

/** The faculty directory, in the department's order. */
export async function getFaculty(): Promise<Faculty[]> {
  "use cache";
  cacheTag(FACULTY_TAG);
  cacheLife("hours");

  if (!supabaseEnv) return sampleFaculty;

  const { data, error } = await createPublicClient()
    .from("faculty")
    .select("id, name, designation, room, email, photo_url, position")
    .eq("active", true)
    .order("position")
    .order("name");
  if (error) throw new Error(`Couldn't load the faculty directory: ${error.message}`);
  return (data as FacultyRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    designation: row.designation,
    room: row.room,
    email: row.email,
    photoUrl: row.photo_url,
    position: row.position,
  }));
}
