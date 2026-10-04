import { calendarFile, eventPath } from "@/lib/events/calendar";
import { getEvent } from "@/lib/events/queries";

/** /events/[slug]/calendar.ics: the event as a file for Apple Calendar, Outlook and others. */
export async function GET(request: Request, { params }: RouteContext<"/events/[slug]/calendar.ics">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return new Response("Event not found", { status: 404 });

  const pageUrl = new URL(eventPath(slug), request.url).href;
  const body = calendarFile(event, pageUrl, new Date());
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
