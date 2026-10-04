import { getLogs } from "@/lib/logs/queries";
import { logPath } from "@/lib/logs/text";
import { logCategoryLabels } from "@/lib/logs/types";
import { site } from "@/lib/site";

const FEED_SIZE = 20;

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * /logs/feed.xml: the latest logs as RSS 2.0, for feed readers. Built from the cached
 * logs, so it's prerendered and refreshed along with them.
 */
export async function GET() {
  const logs = (await getLogs()).slice(0, FEED_SIZE);
  const feedUrl = `${site.url}/logs/feed.xml`;

  const items = logs
    .map((log) => {
      const url = `${site.url}${logPath(log.slug)}`;
      return `    <item>
      <title>${escapeXml(log.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(log.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(log.author.name)}</dc:creator>
      <category>${logCategoryLabels[log.category]}</category>
      <description>${escapeXml(log.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const lastBuild = logs[0] ? new Date(logs[0].publishedAt).toUTCString() : new Date(0).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Jukti Logs</title>
    <link>${site.url}/logs</link>
    <description>${escapeXml(`Tutorials, event recaps, career advice and stories from ${site.fullName}.`)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
