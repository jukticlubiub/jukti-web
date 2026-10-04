import "server-only";
import { sampleAnswers, sampleQuestions } from "@/lib/data/helpline";
import type { HelplineAnswer, HelplineQuestion, HelplineRole, HelplineTopic } from "./types";

/*
 * The board without Supabase. In preview mode (development) posts are added here and
 * kept in the dev server's memory until it restarts. In production without Supabase
 * it only ever holds the sample questions.
 */

type StoredQuestion = Omit<HelplineQuestion, "answerCount"> & { askerEmail: string | null; hidden?: boolean };
type StoredAnswer = HelplineAnswer & { hidden?: boolean };
type Store = { questions: StoredQuestion[]; answers: StoredAnswer[] };

// On globalThis, so it survives hot reloads and is shared by every module instance.
const KEY = Symbol.for("jukti.helpline.preview");
const holder = globalThis as unknown as Record<symbol, Store | undefined>;

function store(): Store {
  return (holder[KEY] ??= {
    questions: sampleQuestions.map((q) => ({ ...q, askerEmail: null })),
    answers: sampleAnswers.map((a) => ({ ...a })),
  });
}

// Only the public fields leave the store, as with the database's column grants.
function toQuestion(q: StoredQuestion): HelplineQuestion {
  const answerCount = store().answers.filter((a) => a.questionId === q.id && !a.hidden).length;
  return { id: q.id, title: q.title, body: q.body, topic: q.topic, course: q.course, askerName: q.askerName, createdAt: q.createdAt, answerCount };
}

export function previewQuestions(): HelplineQuestion[] {
  return store()
    .questions.filter((q) => !q.hidden)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(toQuestion);
}

export function previewQuestion(id: string): HelplineQuestion | null {
  const question = store().questions.find((q) => q.id === id && !q.hidden);
  return question ? toQuestion(question) : null;
}

export function previewAnswers(questionId: string): HelplineAnswer[] {
  return store()
    .answers.filter((a) => a.questionId === questionId && !a.hidden)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((a) => ({ id: a.id, questionId: a.questionId, authorName: a.authorName, authorRole: a.authorRole, body: a.body, createdAt: a.createdAt }));
}

export function previewAsk(input: {
  topic: HelplineTopic;
  course: string | null;
  title: string;
  body: string;
  anonymous: boolean;
  askerName: string;
  askerEmail: string;
}): string {
  const id = crypto.randomUUID();
  store().questions.push({
    id,
    title: input.title,
    body: input.body,
    topic: input.topic,
    course: input.course,
    askerName: input.anonymous ? null : input.askerName,
    askerEmail: input.askerEmail,
    createdAt: new Date().toISOString(),
  });
  return id;
}

/** Adds an answer. Returns what the asker's email needs, or null if the question is gone. */
export function previewAnswer(input: { questionId: string; body: string; authorName: string; authorRole: HelplineRole }) {
  const question = store().questions.find((q) => q.id === input.questionId && !q.hidden);
  if (!question) return null;
  store().answers.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input });
  return { askerEmail: question.askerEmail, askerName: question.askerName, questionTitle: question.title };
}

export function previewHide(kind: "question" | "answer", id: string) {
  const list: { id: string; hidden?: boolean }[] = kind === "question" ? store().questions : store().answers;
  const item = list.find((x) => x.id === id);
  if (item) item.hidden = true;
}
