"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { sampleFaculty } from "@/lib/data/faculty";
import { createSessionClient } from "@/lib/supabase/server";
import { emailAskerAboutAnswer, emailFacultyAboutQuestion } from "./emails";
import { helplineMode } from "./mode";
import { previewAnswer, previewAsk, previewHide } from "./preview";
import { HELPLINE_TAG } from "./queries";
import { helplineLimits as limits, type HelplineRole, helplineTopics } from "./types";
import { nameFromClaims, PREVIEW_VIEWER } from "./viewer";

const count = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Asking
// ---------------------------------------------------------------------------

export type AskField = "topic" | "course" | "title" | "body";

export type AskFormState = {
  status: "idle" | "error" | "posted";
  values?: Partial<Record<AskField, string>> & { anonymous?: boolean };
  fieldErrors?: Partial<Record<AskField, string>>;
  error?: string;
  /** The new question, once posted. */
  questionId?: string;
};

const askSchema = z.object({
  topic: z.enum(helplineTopics, "Choose a topic."),
  course: z
    .string()
    .trim()
    .max(limits.course.max, "Keep the course short, e.g. CSE 203.")
    .transform((course) => course.replace(/\s+/g, " ").toUpperCase()),
  title: z
    .string()
    .trim()
    .min(limits.title.min, "Give your question a short title.")
    .max(limits.title.max, `Keep the title under ${limits.title.max} characters.`),
  body: z
    .string()
    .trim()
    .min(limits.body.min, `Add a little more detail (at least ${limits.body.min} characters), so people can help.`)
    .max(limits.body.max, `Keep it under ${count(limits.body.max)} characters.`),
  anonymous: z.boolean(),
});

// Errors raised by ask_helpline_question().
const askErrors: Record<string, string> = {
  not_authenticated: "Your session has expired. Sign in again to ask.",
  invalid_topic: "Choose a topic.",
  invalid_course: "Keep the course short, e.g. CSE 203.",
  invalid_title: "Give your question a short title.",
  invalid_body: `Add a little more detail (at least ${limits.body.min} characters).`,
  rate_limited: "You’ve asked 5 questions today, which is the daily limit. Please ask again tomorrow.",
};

export async function askQuestion(_previous: AskFormState, formData: FormData): Promise<AskFormState> {
  const values = {
    topic: String(formData.get("topic") ?? ""),
    course: String(formData.get("course") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    anonymous: formData.get("anonymous") === "on",
  };

  const mode = helplineMode();
  if (mode === "off") return { status: "error", values, error: "The helpline isn’t open for questions yet." };

  const parsed = askSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: AskFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as AskField;
      fieldErrors[field] ??= issue.message;
    }
    return { status: "error", values, fieldErrors };
  }

  const { topic, title, body, anonymous } = parsed.data;
  const course = parsed.data.course || null;
  let id: string;
  let askerName: string;
  let facultyEmails: () => Promise<string[]>;

  if (mode === "preview") {
    askerName = PREVIEW_VIEWER.name;
    id = previewAsk({ topic, course, title, body, anonymous, askerName, askerEmail: PREVIEW_VIEWER.email });
    facultyEmails = async () => sampleFaculty.map((f) => f.email);
  } else {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.rpc("ask_helpline_question", {
      p_topic: topic,
      p_course: course,
      p_title: title,
      p_body: body,
      p_anonymous: anonymous,
    });
    if (error || typeof data !== "string") {
      return { status: "error", values, error: askErrors[error?.message ?? ""] ?? "Your question couldn’t be posted. Please try again." };
    }
    id = data;
    const { data: auth } = await supabase.auth.getClaims();
    askerName = auth?.claims ? nameFromClaims(auth.claims) : "";
    facultyEmails = async () => {
      const { data: emails, error: recipientsError } = await supabase.rpc("helpline_faculty_recipients");
      if (recipientsError) throw recipientsError;
      return (emails as string[] | null) ?? [];
    };
  }

  updateTag(HELPLINE_TAG);

  // After the response: posting never waits for Gmail.
  const askedAt = new Date();
  after(async () => {
    try {
      await emailFacultyAboutQuestion(
        { id, title, body, topic, course, askerName: anonymous ? null : askerName, askedAt },
        await facultyEmails(),
      );
    } catch (error) {
      console.error("[helpline] Couldn't email the faculty about a new question:", error);
    }
  });

  return { status: "posted", questionId: id };
}

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

export type AnswerFormState = {
  status: "idle" | "error" | "posted";
  body?: string;
  error?: string;
  /** Goes up with every answer posted, so the form can start fresh. */
  posted: number;
  /** Whether the asker is being emailed (not when answering your own question). */
  notified?: boolean;
};

const answerSchema = z
  .string()
  .trim()
  .min(limits.answer.min, "Write your answer first.")
  .max(limits.answer.max, `Keep it under ${count(limits.answer.max)} characters.`);

// Errors raised by answer_helpline_question().
const answerErrors: Record<string, string> = {
  not_authenticated: "Your session has expired. Sign in again to answer.",
  not_an_answerer: "Only JUKTI seniors and CSE faculty can answer questions.",
  invalid_body: "Write your answer first.",
  question_not_found: "This question isn’t available any more.",
};

type AnswerResult = {
  author_name: string;
  author_role: HelplineRole;
  asker_email: string;
  asker_name: string;
  question_title: string;
  own_question: boolean;
};

export async function answerQuestion(previous: AnswerFormState, formData: FormData): Promise<AnswerFormState> {
  const questionId = String(formData.get("questionId") ?? "");
  const raw = String(formData.get("body") ?? "");
  const fail = (error: string): AnswerFormState => ({ status: "error", body: raw, error, posted: previous.posted });

  const mode = helplineMode();
  if (mode === "off") return fail("The helpline isn’t open for answers yet.");

  const parsed = answerSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Write your answer first.");
  const body = parsed.data;

  let notify: Parameters<typeof emailAskerAboutAnswer>[0] | null = null;

  if (mode === "preview") {
    // Preview mode answers as a made-up helper, so the asker's email can be tried too.
    const role: HelplineRole = formData.get("role") === "senior" ? "senior" : "faculty";
    const authorName = role === "faculty" ? "Preview Faculty" : "Preview Senior";
    const question = previewAnswer({ questionId, body, authorName, authorRole: role });
    if (!question) return fail(answerErrors.question_not_found);
    if (question.askerEmail) {
      notify = {
        questionId,
        questionTitle: question.questionTitle,
        askerName: question.askerName ?? PREVIEW_VIEWER.name,
        askerEmail: question.askerEmail,
        authorName,
        authorRole: role,
        body,
      };
    }
  } else {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.rpc("answer_helpline_question", { p_question_id: questionId, p_body: body });
    if (error || !data) return fail(answerErrors[error?.message ?? ""] ?? "Your answer couldn’t be posted. Please try again.");
    const result = data as AnswerResult;
    if (!result.own_question) {
      notify = {
        questionId,
        questionTitle: result.question_title,
        askerName: result.asker_name,
        askerEmail: result.asker_email,
        authorName: result.author_name,
        authorRole: result.author_role,
        body,
      };
    }
  }

  updateTag(HELPLINE_TAG);

  if (notify) {
    const mail = notify;
    after(async () => {
      try {
        await emailAskerAboutAnswer(mail);
      } catch (error) {
        console.error("[helpline] Couldn't email the asker about an answer:", error);
      }
    });
  }

  return { status: "posted", posted: previous.posted + 1, notified: notify !== null };
}

// ---------------------------------------------------------------------------
// Moderation (editors)
// ---------------------------------------------------------------------------

export type HideState = { error?: string };

/** Hides a question or an answer from the board. Editors only (row-level security checks). */
export async function hidePost(_previous: HideState, formData: FormData): Promise<HideState> {
  const kind = formData.get("kind") === "answer" ? "answer" : "question";
  const id = String(formData.get("id") ?? "");
  const mode = helplineMode();

  if (mode === "off") return { error: "Moderation isn’t available yet." };
  if (mode === "preview") {
    previewHide(kind, id);
  } else {
    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from(kind === "question" ? "helpline_questions" : "helpline_answers")
      .update({ status: "hidden" })
      .eq("id", id)
      .select("id");
    if (error || !data?.length) return { error: "That couldn’t be hidden. Are you still signed in as an editor?" };
  }

  updateTag(HELPLINE_TAG);
  // A hidden question's page is gone, so go back to the board.
  if (kind === "question") redirect("/helpline");
  return {};
}
