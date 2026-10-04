"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails from any host */
import { useActionState, useId, useState } from "react";
import { addPhotos, deletePhoto, movePhoto, updatePhoto } from "@/lib/admin/actions/events";
import type { ActionState } from "@/lib/admin/form";
import { cn } from "@/lib/cn";
import { ActionButton, inputClass } from "../forms";
import { uploadImage, type Uploaded } from "../ImageField";

type Photo = { id: string; url?: string; alt: string; width: number; height: number };

/** An event's gallery: upload several photos at once, describe, reorder and delete them (PR Editor). */
export function GalleryManager({ eventId, photos, live }: { eventId: string; photos: Photo[]; live: boolean }) {
  const inputId = useId();
  const [state, formAction, saving] = useActionState(addPhotos, { status: "idle" } as ActionState);
  const [progress, setProgress] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const done: Uploaded[] = [];
    for (const [i, file] of [...files].entries()) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      try {
        done.push(await uploadImage(file, `events/${eventId}`));
      } catch (e) {
        setError(e instanceof Error ? e.message : "An upload failed.");
      }
    }
    setProgress(null);
    setUploaded(done);
  };

  return (
    <div className="grid gap-5">
      {live ? (
        <form
          action={(fd) => {
            formAction(fd);
            setUploaded([]);
          }}
          className="grid gap-3 rounded-[14px] border border-dashed border-glass-border p-4"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="photos" value={JSON.stringify(uploaded.map((u) => ({ ...u, alt: "" })))} />
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={inputId} className={cn("btn-pill btn-ghost h-9 cursor-pointer px-4 text-[0.75rem]", progress && "pointer-events-none opacity-60")}>
              {progress ?? "Choose photos"}
            </label>
            <input id={inputId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            {uploaded.length > 0 && (
              <button type="submit" disabled={saving} className="btn-pill btn-primary h-9 px-4 text-[0.75rem]">
                {saving ? "Adding…" : `Add ${uploaded.length} to the gallery`}
              </button>
            )}
            <span className="text-[0.82rem] text-muted">Resized to 2000px. Describe each one below after adding.</span>
          </div>
          {error && <p className="text-[0.85rem] text-[#ff8f7a]">{error}</p>}
          {state.status === "error" && <p className="text-[0.85rem] text-[#ff8f7a]">{state.message}</p>}
          {state.status === "ok" && state.message && <p className="text-[0.85rem] text-emerald-300">{state.message}</p>}
        </form>
      ) : (
        <p className="rounded-[14px] border border-dashed border-glass-border p-4 text-[0.9rem] text-muted">Uploading photos needs Supabase. Sample photos are shown below.</p>
      )}

      {photos.length === 0 ? (
        <p className="text-[0.92rem] text-muted">No photos yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-[14px] border border-glass-border bg-white/[0.02]">
              <div className="relative aspect-[4/3] bg-white/[0.04]">
                {p.url ? <img src={p.url} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[0.8rem] text-muted">Sample photo {i + 1}</span>}
              </div>
              <div className="grid gap-2 p-3">
                <PhotoAlt id={p.id} alt={p.alt} />
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton action={movePhoto} fields={{ id: p.id, eventId, direction: "up" }} label="←" />
                  <ActionButton action={movePhoto} fields={{ id: p.id, eventId, direction: "down" }} label="→" />
                  <ActionButton action={deletePhoto} fields={{ id: p.id }} label="Delete" confirm="Delete?" tone="danger" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoAlt({ id, alt }: { id: string; alt: string }) {
  const [state, action, pending] = useActionState(updatePhoto, { status: "idle" } as ActionState);
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="alt" defaultValue={alt} placeholder="Describe the photo" aria-label="Photo description" className={cn(inputClass, "h-9 text-[0.85rem]")} />
      <button type="submit" disabled={pending} className="shrink-0 rounded-full border border-glass-border px-3 text-[0.78rem] text-body hover:text-fg">
        {state.status === "ok" ? "✓" : "Save"}
      </button>
    </form>
  );
}
