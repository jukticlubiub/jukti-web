"use client";

import { saveEvent } from "@/lib/admin/actions/events";
import { toDhakaInput } from "@/lib/admin/form";
import type { AdminEvent } from "@/lib/admin/data/events";
import { categoryLabels, eventCategories, rsvpFieldLabels, rsvpStandardFields } from "@/lib/events/types";
import { AdminForm, Select, TextArea, TextField, Toggle } from "../forms";
import { ImageField } from "../ImageField";
import { OpenCreated } from "../OpenCreated";

const toEventPage = (id: string) => `/admin/events/${id}`;

/** Create or edit an event (Event Manager). */
export function EventForm({ event, live }: { event?: AdminEvent; live: boolean }) {
  const agenda = event?.agenda.map((a) => [a.time, a.title, a.detail].filter(Boolean).join(" | ")).join("\n") ?? "";
  const questions =
    event?.rsvp.questions
      .map((q) => [q.label, q.type, ...(q.type === "select" || q.type === "checkbox" ? [q.options.join(", ")] : []), ...(q.required ? ["required"] : [])].join(" | "))
      .join("\n") ?? "";
  const fieldModes = [
    { value: "off", label: "Don’t collect" },
    { value: "optional", label: "Optional" },
    { value: "required", label: "Required" },
  ];
  return (
    <AdminForm action={saveEvent} submitLabel={event ? "Save event" : "Create event"}>
      {(state) => (
        <>
          {!event && <OpenCreated id={state.id} href={toEventPage} label="Opening the event…" />}
          {event && <input type="hidden" name="id" value={event.id} />}
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TextField label="Title" name="title" state={state} defaultValue={event?.title} required />
            <TextField
              label="Web address"
              name="slug"
              state={state}
              defaultValue={event?.slug}
              placeholder="made from the title"
              hint={<span className="text-[0.78rem] text-muted">/events/…</span>}
            />
          </div>
          <TextArea label="Summary (for cards)" name="summary" rows={2} state={state} defaultValue={event?.summary} />
          <TextArea label="Description" name="description" rows={8} state={state} defaultValue={event?.description} hint={<span className="text-[0.78rem] text-muted">A blank line starts a new paragraph</span>} />
          <div className="grid gap-5 md:grid-cols-3">
            <Select label="Category" name="category" state={state} defaultValue={event?.category ?? "workshop"} options={eventCategories.map((c) => ({ value: c, label: categoryLabels[c] }))} />
            <TextField label="Starts (Dhaka time)" name="startsAt" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.startsAt)} />
            <TextField label="Ends (Dhaka time)" name="endsAt" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.endsAt)} />
          </div>
          <TextField label="Venue" name="venue" state={state} defaultValue={event?.venue} placeholder="e.g. Auditorium, IUB" />
          <ImageField label="Cover image (optional: without one the site draws cover art)" name="coverUrl" folder="events" preset="eventCover" defaultUrl={event?.cover?.url} live={live} />
          <TextField label="Cover description (for screen readers)" name="coverAlt" state={state} defaultValue={event?.cover?.alt} />
          <TextArea
            label="Agenda (optional)"
            name="agenda"
            rows={4}
            mono
            state={state}
            defaultValue={agenda}
            placeholder={"3:00 PM | Welcome | Doors open\n3:30 PM | Keynote"}
            hint={<span className="text-[0.78rem] text-muted">One line each: time | title | detail</span>}
          />
          <fieldset className="grid gap-4 rounded-[14px] border border-glass-border p-4">
            <legend className="px-2 text-[0.85rem] text-muted">RSVP</legend>
            <Toggle label="Take RSVPs" name="rsvpEnabled" defaultChecked={event?.rsvp.enabled} hint="People sign in with Google to reserve a seat." />
            <Select
              label="Who can RSVP"
              name="audience"
              state={state}
              defaultValue={event?.rsvp.audience ?? "iub"}
              options={[
                { value: "iub", label: "IUB students only (@iub.edu.bd)" },
                { value: "open", label: "Open to everyone" },
              ]}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Seats (empty = no limit)" name="capacity" type="number" min={1} state={state} defaultValue={event?.rsvp.capacity ?? ""} />
              <TextField label="RSVPs close (empty = when it starts)" name="rsvpDeadline" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.rsvp.deadline)} />
            </div>
            <div className="grid gap-3">
              <p className="text-[0.85rem] text-muted">What to ask (name &amp; email are always collected; IUB members have theirs filled in from their profile):</p>
              <div className="grid gap-5 sm:grid-cols-2">
                {rsvpStandardFields.map((f) => (
                  <Select key={f} label={rsvpFieldLabels[f]} name={`field_${f}`} state={state} defaultValue={event?.rsvp.fields[f] ?? "off"} options={fieldModes} />
                ))}
              </div>
            </div>
            <TextArea
              label="Custom questions (optional)"
              name="questions"
              rows={4}
              mono
              state={state}
              defaultValue={questions}
              placeholder={"T-shirt size | select | S, M, L, XL | required\nDietary needs | short\nYour question for the panel | long"}
              hint={<span className="text-[0.78rem] text-muted">One per line: label | type | options | required. Type: short, long, select, checkbox. Options (comma-separated) only for select/checkbox.</span>}
            />
          </fieldset>
          <fieldset className="grid gap-4 rounded-[14px] border border-glass-border p-4">
            <legend className="px-2 text-[0.85rem] text-muted">Registration fee</legend>
            <p className="text-[0.85rem] leading-relaxed text-muted">
              Leave empty for a free event. With a fee, attendees pay by bKash using their ticket code as the reference, enter their bKash
              number, and you mark them paid under RSVPs. Unpaid tickets can’t check in. The fee applies to RSVPs made after you set it.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Fee (taka)" name="feeAmount" type="number" min={0} state={state} defaultValue={event?.fee?.amount ?? ""} placeholder="e.g. 200" />
              <TextField label="bKash number (empty = the club’s)" name="feeBkashNumber" type="tel" state={state} defaultValue={event?.fee?.bkashNumber ?? ""} placeholder="01XXXXXXXXX" />
            </div>
            <TextField label="Note for attendees (optional)" name="feeNote" state={state} defaultValue={event?.fee?.note ?? ""} placeholder="e.g. Includes lunch and a T-shirt" maxLength={500} />
          </fieldset>
          <Toggle label="Published" name="published" defaultChecked={event?.published ?? false} hint="Unpublished events are only visible here." />
        </>
      )}
    </AdminForm>
  );
}
