"use client";

import { savePastEvent } from "@/lib/admin/actions/events";
import { toDhakaInput } from "@/lib/admin/form";
import type { AdminEvent } from "@/lib/admin/data/events";
import { categoryLabels, eventCategories } from "@/lib/events/types";
import { AdminForm, Select, TextArea, TextField } from "../forms";
import { ImageField } from "../ImageField";
import { OpenCreated } from "../OpenCreated";

const toGallery = (id: string) => `/admin/events/${id}?tab=recap`;

/**
 * Add an event that already happened (or fix one's details), to document it: what it
 * was, when and where, a cover and the recap. No RSVPs. Photos go in the gallery next.
 */
export function PastEventForm({ event, live }: { event?: AdminEvent; live: boolean }) {
  return (
    <AdminForm action={savePastEvent} submitLabel={event ? "Save" : "Add past event"}>
      {(state) => (
        <>
          {!event && <OpenCreated id={state.id} href={toGallery} />}
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
          <div className="grid gap-5 md:grid-cols-3">
            <Select label="Category" name="category" state={state} defaultValue={event?.category ?? "workshop"} options={eventCategories.map((c) => ({ value: c, label: categoryLabels[c] }))} />
            <TextField label="Started (Dhaka time)" name="startsAt" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.startsAt)} />
            <TextField label="Ended (Dhaka time)" name="endsAt" type="datetime-local" state={state} defaultValue={toDhakaInput(event?.endsAt)} />
          </div>
          <TextField label="Venue" name="venue" state={state} defaultValue={event?.venue} placeholder="e.g. Auditorium, IUB" />
          <TextArea label="Summary (for cards)" name="summary" rows={2} state={state} defaultValue={event?.summary} />
          <TextArea label="Description (optional)" name="description" rows={4} state={state} defaultValue={event?.description} hint={<span className="text-[0.78rem] text-muted">A blank line starts a new paragraph</span>} />
          <ImageField label="Cover image (optional: without one the site draws cover art)" name="coverUrl" folder="events" preset="eventCover" defaultUrl={event?.cover?.url} live={live} />
          <TextField label="Cover description (for screen readers)" name="coverAlt" state={state} defaultValue={event?.cover?.alt} />
          <TextArea
            label="Recap: how it went"
            name="recap"
            rows={6}
            state={state}
            defaultValue={event?.recap}
            hint={<span className="text-[0.78rem] text-muted">Optional now; you can write it later</span>}
          />
        </>
      )}
    </AdminForm>
  );
}
