"use client";

import { saveEvent } from "@/lib/admin/actions/events";
import { toDhakaInput } from "@/lib/admin/form";
import type { AdminEvent } from "@/lib/admin/data/events";
import { categoryLabels, eventCategories } from "@/lib/events/types";
import { AdminForm, Select, TextArea, TextField, Toggle } from "../forms";
import { ImageField } from "../ImageField";
import { OpenCreated } from "../OpenCreated";

const toEventPage = (id: string) => `/admin/events/${id}`;

/** Create or edit an event (Event Manager). */
export function EventForm({ event, live }: { event?: AdminEvent; live: boolean }) {
  const agenda = event?.agenda.map((a) => [a.time, a.title, a.detail].filter(Boolean).join(" | ")).join("\n") ?? "";
  return (
    <AdminForm action={saveEvent} submitLabel={event ? "Save event" : "Create event"}>
      {(state) => (
        <>
          {!event && <OpenCreated id={state.id} href={toEventPage} />}
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
            <Toggle label="Take RSVPs" name="rsvpEnabled" defaultChecked={event?.rsvp.enabled} hint="Students sign in with Google to reserve a seat." />
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Seats (empty = no limit)" name="capacity" type="number" min={1} state={state} defaultValue={event?.rsvp.capacity ?? ""} />
              <TextField label="RSVPs close (empty = when it starts)" name="rsvpDeadline" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.rsvp.deadline)} />
            </div>
          </fieldset>
          <Toggle label="Published" name="published" defaultChecked={event?.published ?? false} hint="Unpublished events are only visible here." />
        </>
      )}
    </AdminForm>
  );
}
