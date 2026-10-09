import type { MetadataRoute } from "next";
import { eventPath } from "@/lib/events/calendar";
import { getEvents } from "@/lib/events/queries";
import { getQuestions } from "@/lib/helpline/queries";
import { helplinePath } from "@/lib/helpline/types";
import { getLogs } from "@/lib/logs/queries";
import { logPath } from "@/lib/logs/text";
import { site } from "@/lib/site";

/** The site's public pages, for /sitemap.xml */
const pages = ["/", "/events", "/team", "/about", "/logs", "/helpline", "/join", "/contact", "/about/dr-ali-shihab-sabbir", "/helpline/faculty", "/developers"];

/**
 * /sitemap.xml, submitted in Google Search Console: every public page, published event,
 * published Jukti Log and helpline question, so search engines find them all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, logs, questions] = await Promise.all([getEvents(), getLogs(), getQuestions()]);
  const at = (path: string, lastModified?: string) => ({ url: `${site.url}${path === "/" ? "" : path}`, ...(lastModified ? { lastModified } : {}) });
  return [
    ...pages.map((path) => at(path)),
    ...events.map((event) => at(eventPath(event.slug))),
    ...logs.map((log) => at(logPath(log.slug), log.updatedAt)),
    ...questions.map((question) => at(helplinePath(question.id), question.createdAt)),
  ];
}
