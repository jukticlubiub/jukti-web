import "server-only";
import { emailLayout, escapeHtml, formatEmailTime, textToHtml } from "@/lib/mail/layout";
import { type Mail, sendMail } from "@/lib/mail/send";
import { site } from "@/lib/site";
import { type HelplineRole, helplineRoleLabels, type HelplineTopic, helplineTopicLabels, helplinePath } from "./types";

/** The club inbox: every faculty email is sent to it, with the faculty in Bcc. */
const clubInbox = () => process.env.CONTACT_TO_EMAIL || site.socials.email;

/**
 * Only the production site emails faculty and students. Anywhere else (local
 * development, Vercel preview deployments) every helpline email goes to the club inbox
 * instead, marked as a test, so trying things out never emails the faculty.
 */
const deliversForReal = process.env.NODE_ENV === "production" && (process.env.VERCEL_ENV ?? "production") === "production";

function describe(addresses: string[]) {
  if (addresses.length <= 3) return addresses.join(", ");
  return `${addresses.slice(0, 2).join(", ")} and ${addresses.length - 2} others`;
}

async function deliver(mail: Mail) {
  if (deliversForReal) return sendMail(mail);
  const intended = [...[mail.to].flat(), ...(mail.bcc ?? [])];
  return sendMail({
    ...mail,
    to: clubInbox(),
    bcc: undefined,
    subject: `[Test] ${mail.subject}`,
    text: `Test email. On the live site this goes to: ${describe(intended)}.\n\n${mail.text}`,
  });
}

/** Long questions are cut in the email; the button leads to the rest. */
function clip(text: string, max = 1800) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

type NewQuestion = {
  id: string;
  title: string;
  body: string;
  topic: HelplineTopic;
  course: string | null;
  /** Null when asked anonymously. */
  askerName: string | null;
  askedAt: Date;
};

const footerText = `You're receiving this because you're listed in the CSE faculty directory on the ${site.name} website. To answer, sign in with Google using this email address. If you use a different Google account, or would rather not get these emails, reply and let us know.`;

/** "New question" to every faculty member with notifications on (Bcc, so addresses stay private). */
export async function emailFacultyAboutQuestion(question: NewQuestion, faculty: string[]) {
  if (faculty.length === 0) return;
  const url = `${site.url}${helplinePath(question.id)}#answer`;
  const topic = helplineTopicLabels[question.topic];
  const asker = question.askerName ?? "A student (asked anonymously)";
  const when = formatEmailTime(question.askedAt);
  const body = clip(question.body);

  const text = [
    `A student has asked a question on the ${site.name} Academic Helpline and would appreciate your help.`,
    "",
    question.title,
    "",
    `Topic: ${topic}${question.course ? ` (${question.course})` : ""}`,
    `Asked by: ${asker}`,
    `Asked: ${when}`,
    "",
    body,
    "",
    `Answer it here: ${url}`,
    "",
    footerText,
  ].join("\n");

  const html = emailLayout({
    eyebrow: "Academic Helpline · Support requested",
    heading: question.title,
    rows: [
      ["Topic", escapeHtml(question.course ? `${topic} · ${question.course}` : topic)],
      ["Asked by", escapeHtml(asker)],
      ["Asked", escapeHtml(when)],
    ],
    quoteHtml: textToHtml(body),
    button: { label: "Answer this question", href: url },
    footerHtml: textToHtml(footerText),
  });

  await deliver({ to: clubInbox(), bcc: faculty, subject: `[JUKTI Helpline] New question: ${question.title}`, text, html });
}

type NewAnswer = {
  questionId: string;
  questionTitle: string;
  askerName: string;
  askerEmail: string;
  authorName: string;
  authorRole: HelplineRole;
  body: string;
};

/** "Your question has an answer" to the student who asked. */
export async function emailAskerAboutAnswer(answer: NewAnswer) {
  const url = `${site.url}${helplinePath(answer.questionId)}#answers`;
  const role = helplineRoleLabels[answer.authorRole];
  const by = answer.authorRole === "editor" ? answer.authorName : `${answer.authorName} (${role})`;
  const firstName = answer.askerName.split(/\s+/)[0] || "there";
  const body = clip(answer.body);

  const text = [
    `Hi ${firstName},`,
    "",
    `${by} answered your question on the ${site.name} Academic Helpline:`,
    "",
    answer.questionTitle,
    "",
    body,
    "",
    `See the answer: ${url}`,
  ].join("\n");

  const html = emailLayout({
    eyebrow: "Academic Helpline · New answer",
    heading: `Your question has an answer`,
    rows: [
      ["Question", escapeHtml(answer.questionTitle)],
      ["Answered by", escapeHtml(by)],
    ],
    quoteHtml: textToHtml(body),
    button: { label: "See the answer", href: url },
    footerHtml: `You asked this on the ${escapeHtml(site.name)} Academic Helpline, so we let you know when someone answers.`,
  });

  await deliver({ to: answer.askerEmail, subject: `Your question has an answer: ${answer.questionTitle}`, text, html });
}
