import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, Eyebrow } from "@/components/members/AccountHeader";
import { ArrowIcon } from "@/components/ui/icons";
import { eventPath } from "@/lib/events/calendar";
import { requestTime } from "@/lib/events/now";
import { formatDay } from "@/lib/events/time";
import { helplinePath } from "@/lib/helpline/types";
import { cn } from "@/lib/cn";
import { requireMember } from "@/lib/members/account";
import { type EventActivity, getActivity } from "@/lib/members/activity";

export const metadata: Metadata = { title: "Your activity", robots: { index: false } };

export default function ActivityPage() {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <AccountHeader title="YOUR" accent="ACTIVITY" subtitle="Events, certificates and helpline posts." active="/account/activity" />
      <div className="relative mx-auto max-w-[64rem] px-5 pt-[clamp(3rem,5vw,5rem)]">
        <Suspense fallback={<div aria-hidden className="h-[26rem] rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse" />}>
          <ActivityBody />
        </Suspense>
      </div>
    </div>
  );
}

async function ActivityBody() {
  const [{ mode, user }, now] = await Promise.all([requireMember(), requestTime()]);
  const { events, helpline } = await getActivity(mode, user.id);
  const attended = events.filter((a) => a.checkedInAt);
  const upcoming = events.filter((a) => a.status !== "cancelled" && Date.parse(a.event.endsAt) > now);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat value={attended.length} label={attended.length === 1 ? "Event attended" : "Events attended"} />
        <Stat value={upcoming.length} label="Coming up" />
        <Stat value={helpline.filter((h) => h.kind === "answer").length} label="Helpline answers" />
      </div>

      <section className="glass-card p-6 sm:p-8" aria-labelledby="events-heading">
        <Eyebrow>Events</Eyebrow>
        <h2 id="events-heading" className="sr-only">Events</h2>
        {events.length === 0 ? (
          <p className="mt-4 text-body/85">
            No RSVPs yet. Find something on{" "}
            <Link href="/events" className="text-flare underline-offset-4 hover:underline">
              Our Events
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-glass-border">
            {events.map((a) => (
              <EventRow key={a.event.id} activity={a} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card p-6 sm:p-8" aria-labelledby="helpline-heading">
        <Eyebrow>Academic Helpline</Eyebrow>
        <h2 id="helpline-heading" className="sr-only">Academic Helpline</h2>
        {helpline.length === 0 ? (
          <p className="mt-4 text-body/85">
            Nothing yet. Stuck on a course?{" "}
            <Link href="/helpline" className="text-flare underline-offset-4 hover:underline">
              Ask the helpline
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-glass-border">
            {helpline.map((h) => (
              <li key={`${h.kind}-${h.questionId}-${h.createdAt}`} className="flex items-center gap-4 py-3.5">
                <span className="w-20 shrink-0 text-[0.78rem] tracking-[0.08em] text-muted uppercase">{h.kind === "question" ? "Asked" : "Answered"}</span>
                <Link href={helplinePath(h.questionId)} className="min-w-0 flex-1 truncate text-fg hover:text-flare">
                  {h.title}
                </Link>
                {h.status !== "visible" && <span className="text-[0.8rem] text-muted">Hidden</span>}
                <span className="shrink-0 text-[0.85rem] text-muted">{formatDay(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EventRow({ activity: a, now }: { activity: EventActivity; now: number }) {
  const over = Date.parse(a.event.endsAt) <= now;
  const label = a.checkedInAt
    ? "Attended"
    : a.status === "cancelled"
      ? "Cancelled"
      : a.status === "waitlisted"
        ? over
          ? "Waitlisted"
          : "On the waitlist"
        : over
          ? "Didn’t check in"
          : "Going";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <div className="min-w-0 flex-1">
        <Link href={eventPath(a.event.slug)} className="font-medium text-fg hover:text-flare">
          {a.event.title}
        </Link>
        <p className="mt-0.5 text-[0.88rem] text-muted">
          {formatDay(a.event.startsAt)} · {a.event.venue}
          {!over && a.ticketCode && a.status !== "cancelled" && (
            <>
              {" · "}
              <Link href={`${eventPath(a.event.slug)}#rsvp`} className="font-mono text-flare hover:underline">
                {a.ticketCode}
              </Link>
              {a.unpaid && <span className="text-amber-200"> (fee not confirmed)</span>}
            </>
          )}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-[0.78rem]",
          a.checkedInAt ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-glass-border text-muted",
        )}
      >
        {label}
      </span>
      {a.checkedInAt && (
        <Link href={`/account/certificates/${a.event.slug}`} className="inline-flex items-center gap-1.5 text-[0.88rem] text-flare hover:underline">
          Certificate
          <ArrowIcon className="size-3.5" />
        </Link>
      )}
    </li>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass-card p-4 text-center sm:p-6">
      <p className="font-heading text-[clamp(1.6rem,3vw,2.4rem)] text-fg tabular-nums">{value}</p>
      <p className="mt-1 text-[0.8rem] text-muted sm:text-[0.88rem]">{label}</p>
    </div>
  );
}
