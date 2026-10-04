"use client";

import { saveRecap } from "@/lib/admin/actions/events";
import { AdminForm, TextArea } from "../forms";

/** The write-up of a past event (PR Editor). */
export function RecapForm({ eventId, recap }: { eventId: string; recap: string | null }) {
  return (
    <AdminForm action={saveRecap} submitLabel="Save recap">
      {(state) => (
        <>
          <input type="hidden" name="eventId" value={eventId} />
          <TextArea
            label="Recap"
            name="recap"
            rows={7}
            state={state}
            defaultValue={recap}
            placeholder="What happened, who won, what people took away…"
            hint={<span className="text-[0.78rem] text-muted">Shown on the event page once it’s over</span>}
          />
        </>
      )}
    </AdminForm>
  );
}
