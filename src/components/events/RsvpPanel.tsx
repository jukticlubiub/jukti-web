"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth/actions";
import { rsvpAction, type RsvpField, type RsvpFormState } from "@/lib/events/actions";
import type { RsvpState } from "@/lib/events/rsvp";
import { formatDay, formatTime } from "@/lib/events/time";
import { AddToCalendar } from "./AddToCalendar";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { CheckIcon, ClockIcon } from "@/components/ui/icons";
import { SeatsMeter } from "./SeatsMeter";

type PanelEvent = { id: string; slug: string; title: string; startsAt: string; hasPhotos: boolean };

type View = "none" | "ended" | "closed" | "off" | "signed-out" | "form" | "registered" | "waitlisted";

function viewFor(state: RsvpState): View {
  if (state.phase === "none") return "none";
  if (state.phase === "ended") return "ended";
  if (state.registration) return state.registration.status;
  if (state.phase === "closed") return "closed";
  if (state.mode === "off") return "off";
  if (!state.viewer) return "signed-out";
  return "form";
}

const isFull = ({ capacity, registered }: RsvpState["seats"]) => capacity !== null && registered >= capacity;

function headingFor(view: View, state: RsvpState) {
  switch (view) {
    case "none":
      return "Just show up";
    case "ended":
      return "This event has ended";
    case "closed":
      return "RSVPs are closed";
    case "off":
      return "RSVP opens soon";
    case "registered":
      return "You’re in!";
    case "waitlisted":
      return "You’re on the waitlist";
    default:
      return isFull(state.seats) ? "Join the waitlist" : "Reserve your seat";
  }
}

const announcements: Record<NonNullable<RsvpFormState["done"]>, string> = {
  registered: "You're registered. See you there!",
  waitlisted: "You're on the waitlist. We'll move you up if a seat frees up.",
  cancelled: "Your RSVP is cancelled.",
};

/**
 * RSVP for one event: sign in with Google, confirm your details, and get a seat or a
 * place on the waitlist. Seats are handed out by the database (register_for_event),
 * so two people can never take the last seat at once.
 */
export function RsvpPanel({
  event,
  initial,
  googleUrl,
  icsPath,
  signInFailed = false,
}: {
  event: PanelEvent;
  initial: RsvpState;
  googleUrl: string;
  icsPath: string;
  /** Came back from a Google sign-in that didn't complete (?signin=failed). */
  signInFailed?: boolean;
}) {
  const [result, formAction, pending] = useActionState(rsvpAction, { state: initial });
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { state } = result;
  const view = viewFor(state);
  const showSeats = state.phase === "open" || view === "closed";

  const cancel = (formData: FormData) => {
    setConfirmingCancel(false);
    formAction(formData);
  };

  return (
    <div className="glass-card p-6 sm:p-7">
      <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">RSVP</p>
      <h2 id="rsvp-title" className="mt-2.5 font-heading text-[clamp(1.35rem,1.7vw,1.65rem)] leading-[1.15]">
        {headingFor(view, state)}
      </h2>

      {showSeats && (
        <SeatsMeter seats={state.seats} inviteToWaitlist={state.phase === "open" && !state.registration} className="mt-5" />
      )}
      {state.phase === "open" && (
        <p className="mt-4 flex items-center gap-2 text-[0.9rem] text-muted">
          <ClockIcon />
          Closes {formatDay(state.closesAt)}, {formatTime(state.closesAt)}
        </p>
      )}

      <p role="status" className="sr-only">
        {result.done ? announcements[result.done] : ""}
      </p>

      <div className="mt-6 border-t border-glass-border pt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {view === "none" && (
              <Body>
                <p>No RSVP needed for this one. It’s open to everyone, so add it to your calendar and come along.</p>
                <AddToCalendar googleUrl={googleUrl} icsPath={icsPath} className="mt-5" />
              </Body>
            )}

            {view === "ended" && (
              <Body>
                <p>Thanks to everyone who came{state.seats.registered > 0 ? `, all ${state.seats.registered} of you` : ""}.</p>
                {event.hasPhotos && (
                  <a href="#gallery" className="btn-pill btn-ghost mt-5 w-full text-[0.85rem]">
                    See the photos
                  </a>
                )}
              </Body>
            )}

            {view === "closed" && (
              <Body>
                <p>
                  RSVPs closed on {formatDay(state.closesAt)}. You can still add the event to your calendar.
                </p>
                <AddToCalendar googleUrl={googleUrl} icsPath={icsPath} className="mt-5" />
              </Body>
            )}

            {view === "off" && (
              <Body>
                <p>Online RSVP isn’t open yet. Keep an eye on this page and our socials for the announcement.</p>
                <AddToCalendar googleUrl={googleUrl} icsPath={icsPath} className="mt-5" />
              </Body>
            )}

            {view === "signed-out" && (
              <Body>
                <p>Sign in with your Google account to RSVP. We’ll use it to confirm your seat and remember your details next time.</p>
                <GoogleSignIn next={`/events/${event.slug}#rsvp`} className="mt-5" />
                {signInFailed && <ErrorText>Sign-in didn’t complete. Please try again.</ErrorText>}
              </Body>
            )}

            {view === "form" && state.viewer && (
              <>
                {result.done === "cancelled" && (
                  <p className="mb-5 rounded-[12px] border border-glass-border bg-white/[0.04] px-4 py-3 text-[0.95rem] text-body">
                    Your RSVP is cancelled. You can sign up again below while seats last.
                  </p>
                )}
                {state.mode === "live" && (
                  <form action={signOut} className="mb-5 flex flex-wrap items-center gap-x-2 text-[0.9rem] text-muted">
                    <input type="hidden" name="next" value={`/events/${event.slug}`} />
                    <span>
                      Signed in as <span className="text-body">{state.viewer.email}</span>
                    </span>
                    <button type="submit" className="text-flare underline-offset-4 hover:underline">
                      Sign out
                    </button>
                  </form>
                )}
                <form action={formAction} noValidate className="grid gap-4">
                  <input type="hidden" name="eventId" value={event.id} />
                  <Field
                    label="Full name"
                    name="name"
                    autoComplete="name"
                    defaultValue={result.values?.name ?? state.viewer.name}
                    error={result.fieldErrors?.name}
                  />
                  <Field
                    label="IUB student ID"
                    name="studentId"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="7 digits"
                    defaultValue={result.values?.studentId ?? state.viewer.studentId}
                    error={result.fieldErrors?.studentId}
                  />
                  {state.mode === "preview" && (
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={result.values?.email ?? state.viewer.email}
                      error={result.fieldErrors?.email}
                    />
                  )}
                  {result.error && <ErrorText>{result.error}</ErrorText>}
                  <button type="submit" name="intent" value="rsvp" disabled={pending} className="btn-pill btn-primary mt-1 w-full disabled:opacity-70">
                    {pending ? "Saving…" : isFull(state.seats) ? "Join the waitlist" : "Confirm RSVP"}
                  </button>
                </form>
              </>
            )}

            {(view === "registered" || view === "waitlisted") && state.registration && (
              <>
                <Ticket
                  title={event.title}
                  startsAt={event.startsAt}
                  status={state.registration.status}
                  position={state.registration.position}
                  name={state.viewer?.name}
                  studentId={state.viewer?.studentId}
                  celebrate={result.done === "registered" || result.done === "waitlisted"}
                />
                {view === "waitlisted" && (
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-body">
                    If someone cancels before the event, the next person in line gets their seat automatically.
                  </p>
                )}
                {view === "registered" && <AddToCalendar googleUrl={googleUrl} icsPath={icsPath} className="mt-5" />}
                {result.error && <ErrorText>{result.error}</ErrorText>}
                {state.phase === "open" || state.phase === "closed" ? (
                  <div className="mt-5 text-center">
                    {confirmingCancel ? (
                      <form action={cancel} className="grid gap-2.5 rounded-[14px] border border-glass-border bg-white/[0.03] p-4">
                        <p className="text-[0.95rem] text-body">
                          {view === "registered" ? "Give up your seat?" : "Leave the waitlist?"}
                          {state.phase === "closed" ? " RSVPs are closed, so you won’t be able to sign up again." : ""}
                        </p>
                        <input type="hidden" name="eventId" value={event.id} />
                        <div className="flex flex-wrap justify-center gap-2">
                          <button type="submit" name="intent" value="cancel" disabled={pending} className="btn-pill btn-ghost text-[0.8rem]">
                            {pending ? "Cancelling…" : "Yes, cancel"}
                          </button>
                          <button type="button" onClick={() => setConfirmingCancel(false)} className="btn-pill text-[0.8rem] text-body hover:text-fg">
                            Keep it
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        className="text-[0.9rem] text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                      >
                        Can’t make it? Cancel RSVP
                      </button>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {state.mode === "preview" && view !== "none" && (
        <p className="mt-6 text-[0.8rem] leading-relaxed text-muted">
          Preview mode: Supabase isn’t connected, so RSVPs are saved in this browser only. This note is only shown in development.
        </p>
      )}
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="text-[1rem] leading-relaxed text-body">{children}</div>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[0.92rem] text-[#ff8f7a]">
      {children}
    </p>
  );
}

function Field({
  label,
  name,
  error,
  className,
  ...input
}: {
  label: string;
  name: RsvpField;
  error?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.85rem] font-normal text-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full rounded-[12px] border bg-white/[0.04] px-4 text-base text-fg transition-[border-color,background-color] duration-200 placeholder:text-muted/70 hover:bg-white/[0.06] focus:border-flare focus:outline-none",
          error ? "border-[#ff8f7a]/70" : "border-glass-border",
        )}
        {...input}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[0.85rem] text-[#ff8f7a]">
          {error}
        </p>
      )}
    </div>
  );
}

/** The RSVP as a ticket stub: status, the event, and who it's for. */
function Ticket({
  title,
  startsAt,
  status,
  position,
  name,
  studentId,
  celebrate,
}: {
  title: string;
  startsAt: string;
  status: "registered" | "waitlisted";
  position: number | null;
  name?: string;
  studentId?: string;
  celebrate: boolean;
}) {
  const registered = status === "registered";
  return (
    <motion.div
      initial={celebrate ? { scale: 0.94, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-[16px] border p-5",
        registered
          ? "border-flare/45 bg-[linear-gradient(135deg,rgb(200_74_26/0.3),rgb(66_27_8/0.35)_60%,rgb(0_0_0/0.2))] shadow-[0_18px_50px_-24px_rgb(245_124_72/0.8)]"
          : "border-glass-border bg-white/[0.04]",
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            registered ? "bg-lava text-white shadow-[0_0_24px_rgb(245_124_72/0.7)]" : "border border-flare/50 font-display text-[0.95rem] text-flare",
          )}
        >
          {registered ? <CheckIcon className="size-5" /> : `#${position ?? "–"}`}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-fg">{registered ? "Seat confirmed" : `Number ${position ?? "–"} in line`}</p>
          <p className="truncate text-[0.9rem] text-body">{title}</p>
        </div>
      </div>

      {/* Tear line with notches cut into both edges. */}
      <div aria-hidden className="relative -mx-5 my-5 border-t border-dashed border-white/20">
        <span className="absolute -top-2.5 -left-2.5 size-5 rounded-full border border-glass-border bg-[#0d0806]" />
        <span className="absolute -top-2.5 -right-2.5 size-5 rounded-full border border-glass-border bg-[#0d0806]" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.9rem]">
        {name && <TicketItem label="Name" value={name} />}
        {studentId && <TicketItem label="Student ID" value={studentId} />}
        <TicketItem label="Date" value={formatDay(startsAt)} />
        <TicketItem label="Time" value={formatTime(startsAt)} />
      </dl>
    </motion.div>
  );
}

function TicketItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.75rem] tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 truncate text-fg">{value}</dd>
    </div>
  );
}
