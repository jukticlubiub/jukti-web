import GithubSlugger from "github-slugger";
import type { Nodes, Parent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";
import { formatLogDate } from "./format";
import type { JuktiLog, LogCardData, LogHeading } from "./types";

const WORDS_PER_MINUTE = 225;
// Code is read slowly, line by line.
const CODE_LINES_PER_MINUTE = 25;

/** Minutes to read a Markdown body, at least 1. */
export function readingMinutes(markdown: string) {
  let codeLines = 0;
  const prose = markdown.replace(/^(```|~~~)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm, (_block, _fence, code: string) => {
    codeLines += code.split("\n").filter((line) => line.trim()).length;
    return " ";
  });
  const words = prose.match(/[\p{L}\p{N}’'-]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE + codeLines / CODE_LINES_PER_MINUTE));
}

/**
 * The h2s and h3s of a log, with the ids rehype-slug gives them when it's rendered.
 * Every heading is slugged in document order (as rehype-slug does), so repeated
 * titles get the same "-1", "-2" suffixes on both sides.
 */
export function logHeadings(markdown: string): LogHeading[] {
  const slugger = new GithubSlugger();
  const headings: LogHeading[] = [];
  const walk = (node: Nodes) => {
    if (node.type === "heading") {
      const text = toString(node);
      const id = slugger.slug(text);
      if (node.depth === 2 || node.depth === 3) headings.push({ depth: node.depth, text, id });
      return;
    }
    if ("children" in node) for (const child of (node as Parent).children) walk(child);
  };
  walk(fromMarkdown(markdown));
  return headings;
}

/** "LOG 007" */
export function logNumber(n: number) {
  return `LOG ${String(n).padStart(3, "0")}`;
}

export function logPath(slug: string) {
  return `/logs/${slug}`;
}

export function toLogCard(log: JuktiLog): LogCardData {
  return {
    slug: log.slug,
    title: log.title,
    excerpt: log.excerpt,
    category: log.category,
    cover: log.cover,
    author: log.author,
    readingMinutes: log.readingMinutes,
    number: log.number,
    dateLabel: formatLogDate(log.publishedAt),
  };
}
