"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth/actions";
import { rsvpAction, type RsvpFormState } from "@/lib/events/actions";
import type { RsvpRegistration, RsvpState, RsvpViewer } from "@/lib/events/rsvp";
import {
  type EventAudience,
  type EventFee,
  profileGapField,
  profileGapInput,
  type RsvpFields,
  type RsvpQuestion,
  rsvpFieldLabels,
  type RsvpStandardField,
  rsvpStandardFields,
} from "@/lib/events/types";
import { bkashNumber as clubBkash } from "@/lib/members/options";
import { formatDay, formatTime } from "@/lib/events/time";
import { AddToCalendar } from "./AddToCalendar";
import { AvatarField } from "@/components/members/AvatarField";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { CheckIcon, ClockIcon } from "@/components/ui/icons";
import { SeatsMeter } from "./SeatsMeter";

type PanelEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  hasPhotos: boolean;
  fee: EventFee | null;
  audience: EventAudience;
  fields: RsvpFields;
  questions: RsvpQuestion[];
};

type View = "none" | "ended" | "closed" | "off" | "signed-out" | "wrong-account" | "form" | "registered" | "waitlisted";

const isIubEmail = (email: string | undefined) => /@iub\.edu\.bd$/i.test(email ?? "");

function viewFor(state: RsvpState, audience: EventAudience): View {
  if (state.phase === "none") return "none";
  if (state.phase === "ended") return "ended";
  if (state.registration) return state.registration.status;
  if (state.phase === "closed") return "closed";
  if (state.mode === "off") return "off";
  if (!state.viewer) return "signed-out";
  if (audience === "iub" && state.mode === "live" && !isIubEmail(state.viewer.email)) return "wrong-account";
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
    case "wrong-account":
      return "IUB students only";
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
  paid: "Thanks! We'll confirm your payment soon.",
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
  const view = viewFor(state, event.audience);
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
                <p>
                  {event.audience === "iub"
                    ? "This event is for IUB students. Sign in with your IUB Google account (your 7-digit ID @iub.edu.bd) to RSVP."
                    : "Sign in with your Google account to RSVP. We’ll use it to confirm your seat and remember your details next time."}
                </p>
                <GoogleSignIn next={`/events/${event.slug}#rsvp`} iub={event.audience === "iub"} className="mt-5" />
                {signInFailed && <ErrorText>Sign-in didn’t complete. Please try again.</ErrorText>}
              </Body>
            )}

            {view === "wrong-account" && state.viewer && (
              <Body>
                <p>
                  This event is open to IUB students only, but you’re signed in as{" "}
                  <span className="text-fg">{state.viewer.email}</span>. Sign in with your IUB account (your 7-digit ID @iub.edu.bd) to RSVP.
                </p>
                <form action={signOut} className="mt-5">
                  <input type="hidden" name="next" value={`/events/${event.slug}`} />
                  <button type="submit" className="btn-pill btn-ghost w-full">
                    Sign out and switch account
                  </button>
                </form>
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
                  {rsvpStandardFields
                    .filter((f) => event.fields[f])
                    .map((f) => (
                      <StandardField
                        key={f}
                        field={f}
                        required={event.fields[f] === "required" || profileAsks(state.viewer?.profileGaps, f)}
                        viewer={state.viewer ?? undefined}
                        value={result.values?.[f === "student_id" ? "studentId" : f]}
                        error={result.fieldErrors?.[f === "student_id" ? "studentId" : f]}
                      />
                    ))}
                  {state.mode === "live" && (state.viewer.profileGaps?.length ?? 0) > 0 && (
                    <CompleteMembership
                      viewer={state.viewer}
                      fields={event.fields}
                      values={result.values}
                      errors={result.fieldErrors}
                    />
                  )}
                  {event.questions.map((q) => (
                    <QuestionField key={q.id} question={q} value={result.values?.[q.id]} error={result.fieldErrors?.[q.id]} />
                  ))}
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
                  {event.fee && (
                    <p className="rounded-[12px] border border-flare/30 bg-lava/10 px-4 py-3 text-[0.92rem] leading-relaxed text-body">
                      Registration fee: <strong className="text-fg">৳{event.fee.amount}</strong>, paid by bKash after you register (we’ll show you how).
                      {event.fee.note ? ` ${event.fee.note}` : ""}
                    </p>
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
                  ticketCode={state.registration.ticketCode}
                  payment={state.registration.payment.status}
                  celebrate={result.done === "registered" || result.done === "waitlisted"}
                />
                {view === "registered" && event.fee && state.registration.payment.status !== "not_required" && (
                  <Payment
                    eventId={event.id}
                    fee={event.fee}
                    registration={state.registration}
                    action={formAction}
                    pending={pending}
                    values={result.values}
                    errors={result.fieldErrors}
                    justPaid={result.done === "paid"}
                  />
                )}
                {(result.done === "registered" || result.done === "waitlisted") && state.mode === "live" && (
                  <p className="mt-4 text-[0.88rem] text-muted">We’ve emailed your ticket to {state.viewer?.email}.</p>
                )}
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
  name: string;
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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const withOptional = (label: string, required: boolean) => (required ? label : `${label} (optional)`);

const inputClasses = (error?: string) =>
  cn(
    "w-full rounded-[12px] border bg-white/[0.04] px-4 text-base text-fg transition-[border-color,background-color] duration-200 placeholder:text-muted/70 hover:bg-white/[0.06] focus:border-flare focus:outline-none",
    error ? "border-[#ff8f7a]/70" : "border-glass-border",
  );

/** A configurable standard field (student ID, department, phone, blood group), prefilled from the member's profile. */
function StandardField({
  field,
  required,
  viewer,
  value,
  error,
}: {
  field: RsvpStandardField;
  required: boolean;
  viewer?: RsvpViewer;
  value?: string;
  error?: string;
}) {
  const prefill =
    field === "student_id"
      ? viewer?.studentId
      : field === "department"
        ? viewer?.department
        : field === "phone"
          ? viewer?.phone
          : field === "facebook"
            ? viewer?.facebook
            : viewer?.bloodGroup;
  const defaultValue = value ?? prefill ?? "";
  const label = withOptional(rsvpFieldLabels[field], required);
  if (field === "blood_group") {
    return <SelectField label={label} name="blood_group" defaultValue={defaultValue} options={BLOOD_GROUPS} error={error} placeholder="Select" />;
  }
  if (field === "student_id") {
    return <Field label={label} name="studentId" inputMode="numeric" maxLength={7} placeholder="7 digits" defaultValue={defaultValue} error={error} />;
  }
  if (field === "facebook") {
    return <Field label={label} name="facebook" type="url" inputMode="url" placeholder="https://facebook.com/your.profile" defaultValue={defaultValue} error={error} />;
  }
  if (field === "phone") {
    return <Field label={label} name="phone" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={defaultValue} error={error} />;
  }
  return <Field label={label} name="department" defaultValue={defaultValue} error={error} />;
}

/** Whether the event's own field also fills a missing profile detail (so it's required). */
function profileAsks(gaps: RsvpViewer["profileGaps"], field: RsvpStandardField) {
  return (gaps ?? []).some((gap) => gap in profileGapField && profileGapField[gap as keyof typeof profileGapField] === field);
}

/**
 * A member whose profile is missing details (usually imported from the registration app, here
 * for the first time) adds them with the RSVP: one submit finishes signing up and RSVPs.
 * Details the event already asks for (phone, department) aren't repeated here.
 */
function CompleteMembership({
  viewer,
  fields,
  values,
  errors,
}: {
  viewer: RsvpViewer;
  fields: RsvpFields;
  values?: Record<string, string>;
  errors?: Record<string, string>;
}) {
  const gaps = (viewer.profileGaps ?? []).filter((gap) => {
    const asked = gap in profileGapField ? profileGapField[gap as keyof typeof profileGapField] : null;
    return !(asked && fields[asked]);
  });
  if (gaps.length === 0) return null;
  const value = (gap: string) => values?.[profileGapInput(gap)];
  const error = (gap: string) => errors?.[profileGapInput(gap)];

  return (
    <fieldset className="grid gap-4 rounded-[14px] border border-flare/30 bg-lava/[0.07] p-4 sm:p-5">
      <legend className="sr-only">Complete your JUKTI membership</legend>
      <div>
        <p className="font-heading text-[1.02rem] text-fg">Complete your JUKTI membership</p>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-body">
          You’re already a JUKTI member. Add the details below to finish your profile. They’re saved with your RSVP.
        </p>
      </div>
      {gaps.includes("photo_url") && (
        <AvatarField userId={viewer.userId ?? ""} name={viewer.name} defaultUrl={value("photo_url") || null} live error={error("photo_url")} />
      )}
      {gaps.includes("secondary_email") && (
        <Field
          label="Personal email (not your IUB one)"
          name="secondary_email"
          type="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          defaultValue={value("secondary_email")}
          error={error("secondary_email")}
        />
      )}
      {gaps.includes("contact_number") && (
        <Field
          label="Mobile number"
          name="contact_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          defaultValue={value("contact_number") ?? viewer.phone}
          error={error("contact_number")}
        />
      )}
      {gaps.includes("department") && <Field label="Department" name="m_department" defaultValue={value("department")} error={error("department")} />}
      {gaps.includes("residence_area") && (
        <Field label="Where you live (area)" name="residence_area" defaultValue={value("residence_area")} error={error("residence_area")} />
      )}
    </fieldset>
  );
}

/** A custom question: short text, long text, single choice, or multiple choice. */
function QuestionField({ question: q, value, error }: { question: RsvpQuestion; value?: string; error?: string }) {
  const label = withOptional(q.label, q.required);
  if (q.type === "long") return <TextAreaField label={label} name={q.id} defaultValue={value} error={error} />;
  if (q.type === "select") return <SelectField label={label} name={q.id} defaultValue={value} options={q.options} error={error} placeholder="Choose…" />;
  if (q.type === "checkbox") return <CheckboxGroup label={label} name={q.id} options={q.options} error={error} />;
  return <Field label={label} name={q.id} defaultValue={value} error={error} />;
}

function FieldShell({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.85rem] font-normal text-muted">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[0.85rem] text-[#ff8f7a]">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, options, defaultValue, placeholder, error }: { label: string; name: string; options: string[]; defaultValue?: string; placeholder?: string; error?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error}>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} aria-invalid={error ? true : undefined} className={cn(inputClasses(error), "h-12 appearance-none bg-[#141110]")}>
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function TextAreaField({ label, name, defaultValue, error }: { label: string; name: string; defaultValue?: string; error?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error}>
      <textarea id={id} name={name} rows={3} defaultValue={defaultValue ?? ""} aria-invalid={error ? true : undefined} className={cn(inputClasses(error), "resize-y py-3")} />
    </FieldShell>
  );
}

function CheckboxGroup({ label, name, options, error }: { label: string; name: string; options: string[]; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <div className="grid gap-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2.5 text-[0.95rem] text-body">
            <input type="checkbox" name={name} value={o} className="size-4 rounded border-glass-border bg-white/[0.04] accent-flare" />
            {o}
          </label>
        ))}
      </div>
    </FieldShell>
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
  ticketCode,
  payment,
  celebrate,
}: {
  title: string;
  startsAt: string;
  status: "registered" | "waitlisted";
  position: number | null;
  name?: string;
  studentId?: string;
  ticketCode: string | null;
  payment: RsvpRegistration["payment"]["status"];
  celebrate: boolean;
}) {
  const registered = status === "registered";
  // The QR only works at the entry once the seat is confirmed and any fee paid.
  const usable = registered && (payment === "not_required" || payment === "paid");
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

      {ticketCode && (
        <div className="mt-5 flex items-center gap-4 rounded-[12px] bg-black/25 p-3">
          {usable ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated per ticket by /tickets/[code]/qr.png
            <img src={`/tickets/${ticketCode}/qr.png`} alt={`QR code for ticket ${ticketCode}`} width={112} height={112} className="size-28 shrink-0 rounded-[10px] bg-white p-1.5" />
          ) : (
            <span className="grid size-28 shrink-0 place-items-center rounded-[10px] border border-dashed border-white/25 p-2 text-center text-[0.75rem] text-muted">
              {registered ? "QR code after payment" : "QR code once you get a seat"}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[0.75rem] tracking-[0.12em] text-muted uppercase">Ticket</p>
            <p className="mt-1 font-mono text-[1.25rem] tracking-[0.12em] text-fg">{ticketCode}</p>
            <p className="mt-1 text-[0.82rem] leading-snug text-muted">{usable ? "Show this at the entry." : "Keep this code: it’s also emailed to you."}</p>
          </div>
        </div>
      )}
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

/** A paid event: how to pay (the ticket code is the bKash reference), then report it. */
function Payment({
  eventId,
  fee,
  registration,
  action,
  pending,
  values,
  errors,
  justPaid,
}: {
  eventId: string;
  fee: EventFee;
  registration: RsvpRegistration;
  action: (formData: FormData) => void;
  pending: boolean;
  values?: RsvpFormState["values"];
  errors?: RsvpFormState["fieldErrors"];
  justPaid: boolean;
}) {
  const { status, sender, txn } = registration.payment;
  const payTo = fee.bkashNumber || clubBkash;

  if (status === "paid") {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-[12px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-[0.95rem] text-emerald-200">
        <CheckIcon className="size-4" /> Fee paid (৳{fee.amount}). You’re all set.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3 rounded-[14px] border border-flare/30 bg-lava/10 p-4">
      <p className="text-[0.78rem] font-medium tracking-[0.18em] text-flare uppercase">Registration fee: ৳{fee.amount}</p>
      {status === "submitted" ? (
        <p className="text-[0.95rem] leading-relaxed text-body">
          {justPaid ? "Thanks! " : ""}We’re checking your payment from <span className="text-fg tabular-nums">{sender}</span>
          {txn ? ` (${txn})` : ""}. We’ll email you when it’s confirmed, and your ticket will work at the entry.
        </p>
      ) : (
        <>
          <p className="text-[0.95rem] leading-relaxed text-body">
            Send <strong className="text-fg">৳{fee.amount}</strong> by bKash to <strong className="text-fg tabular-nums">{payTo}</strong> (personal) with your ticket
            code <strong className="font-mono text-fg">{registration.ticketCode}</strong> as the reference. Then tell us the number you paid from.
          </p>
          {fee.note && <p className="text-[0.88rem] text-muted">{fee.note}</p>}
          <form action={action} noValidate className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="eventId" value={eventId} />
            <Field label="bKash number you paid from" name="sender" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={values?.sender ?? ""} error={errors?.sender} />
            <Field label="Transaction ID (optional)" name="txn" placeholder="e.g. 9A7B6C5D4E" defaultValue={values?.txn ?? ""} error={errors?.txn} />
            <button type="submit" name="intent" value="pay" disabled={pending} className="btn-pill btn-primary disabled:opacity-70 sm:col-span-2">
              {pending ? "Sending…" : "I’ve paid"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

