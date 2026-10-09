"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails from any host */
import { useState } from "react";
import { deleteRow, moveRow, saveAlumnus, saveBoardTerm, saveChapter, saveDeveloper, saveMemorial, saveSocials, saveTeamMember, setShown } from "@/lib/admin/actions/content";
import { imagePresets } from "@/lib/admin/image-presets";
import type { AdminAlumnus, AdminChapter, AdminDeveloper, AdminTeamMember } from "@/lib/admin/data/content";
import type { MemorialContent, Socials } from "@/lib/content/queries";
import { cn } from "@/lib/cn";
import { ActionButton, AdminForm, inputClass, Select, TextArea, TextField } from "./forms";
import { type Cropped, ImageCropper } from "./ImageCropper";
import { ImageField, uploadBlob } from "./ImageField";
import { Pill } from "./ui";

/** One row of an ordered list: thumbnail, title, Edit (opens the form), show/hide, up/down. */
export function EditableItem({
  table,
  id,
  kind,
  title,
  subtitle,
  imageUrl,
  shown,
  first,
  last,
  deletable = false,
  children,
}: {
  table: "team_members" | "alumni" | "story_chapters" | "developers";
  id: string;
  kind?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  shown: boolean;
  first: boolean;
  last: boolean;
  /** Offer "Delete" (for good, after a confirmation) next to Hide. */
  deletable?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cn("rounded-[16px] border bg-white/[0.02]", shown ? "border-glass-border" : "border-dashed border-glass-border opacity-75")}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-glass-border bg-white/[0.04]">
          {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-fg">{title}</p>
          {subtitle && <p className="truncate text-[0.85rem] text-muted">{subtitle}</p>}
        </div>
        {!shown && <Pill>Hidden</Pill>}
        <div className="flex flex-wrap gap-1.5">
          <ActionButton action={moveRow} fields={{ table, id, direction: "up", ...(kind ? { kind } : {}) }} label="↑" className={first ? "invisible" : undefined} />
          <ActionButton action={moveRow} fields={{ table, id, direction: "down", ...(kind ? { kind } : {}) }} label="↓" className={last ? "invisible" : undefined} />
          <ActionButton action={setShown} fields={{ table, id, shown: String(!shown) }} label={shown ? "Hide" : "Show"} />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="h-8 rounded-full border border-glass-border px-3 text-[0.8rem] text-body hover:text-fg">
            {open ? "Close" : "Edit"}
          </button>
          {deletable && (
            <ActionButton
              action={deleteRow}
              fields={{ table, id }}
              label="Delete"
              tone="danger"
              confirm={`Delete ${title} for good? This can’t be undone.`}
            />
          )}
        </div>
      </div>
      {open && <div className="border-t border-glass-border p-4">{children}</div>}
    </li>
  );
}

export function TeamMemberForm({ member, kind, live }: { member?: AdminTeamMember; kind?: "advisor" | "executive"; live: boolean }) {
  return (
    <AdminForm action={saveTeamMember} submitLabel={member ? "Save" : "Add"} resetOnSave={!member}>
      {(state) => (
        <>
          {member && <input type="hidden" name="id" value={member.id} />}
          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Name" name="name" state={state} defaultValue={member?.name} />
            <TextField label="Designation" name="role" state={state} defaultValue={member?.role} placeholder="e.g. President" />
            <Select
              label="Group"
              name="kind"
              state={state}
              defaultValue={member?.kind ?? kind ?? "executive"}
              options={[
                { value: "advisor", label: "Faculty advisor" },
                { value: "executive", label: "Executive panel" },
              ]}
            />
          </div>
          <TextField label="LinkedIn (optional)" name="linkedin" state={state} defaultValue={member?.linkedin} placeholder="https://www.linkedin.com/in/…" />
          <ImageField label="Portrait (a transparent cut-out works best; shown in black and white)" name="photoUrl" folder="team" preset="teamPortrait" defaultUrl={member?.photoUrl} live={live} />
        </>
      )}
    </AdminForm>
  );
}

/** An alumnus, or (with kind "former_advisor") a former faculty advisor. */
export function AlumnusForm({ alumnus, live, kind = alumnus?.kind ?? "alumnus" }: { alumnus?: AdminAlumnus; live: boolean; kind?: AdminAlumnus["kind"] }) {
  const advisor = kind === "former_advisor";
  return (
    <AdminForm action={saveAlumnus} submitLabel={alumnus ? "Save" : "Add"} resetOnSave={!alumnus}>
      {(state) => (
        <>
          {alumnus && <input type="hidden" name="id" value={alumnus.id} />}
          <input type="hidden" name="kind" value={kind} />
          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Name" name="name" state={state} defaultValue={alumnus?.name} placeholder={advisor ? "e.g. Dr. A. B. Rahman" : undefined} />
            {advisor ? (
              <TextField label="Designation" name="role" state={state} defaultValue={alumnus?.role} placeholder="e.g. Associate Professor, CSE" />
            ) : (
              <TextField label="Role" name="role" state={state} defaultValue={alumnus?.role ?? "Executive"} />
            )}
            <TextField label={advisor ? "Years as advisor" : "Term"} name="term" state={state} defaultValue={alumnus?.term} placeholder={advisor ? "2018-2023" : "2024-25"} />
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <TextField label="Email (optional, shown publicly)" name="email" type="email" state={state} defaultValue={alumnus?.email} placeholder="name@example.com" />
            <TextArea
              label="Links (optional, one per line)"
              name="links"
              rows={3}
              state={state}
              defaultValue={alumnus?.links.join("\n")}
              placeholder={"https://www.linkedin.com/in/…\nhttps://www.behance.net/…\nhttps://their-website.com"}
              hint={<span className="text-[0.78rem] text-muted">LinkedIn, website, Behance, GitHub… up to 8</span>}
            />
          </div>
          <ImageField label="Photo (head and shoulders)" name="photoUrl" folder="alumni" preset="alumnus" defaultUrl={alumnus?.photoUrl} live={live} />
        </>
      )}
    </AdminForm>
  );
}

export function ChapterForm({ chapter, live }: { chapter?: AdminChapter; live: boolean }) {
  return (
    <AdminForm action={saveChapter} submitLabel={chapter ? "Save chapter" : "Add chapter"} resetOnSave={!chapter}>
      {(state) => (
        <>
          {chapter && <input type="hidden" name="id" value={chapter.id} />}
          <div className="grid gap-4 md:grid-cols-[1fr_2fr_1fr]">
            <TextField label="Kicker (a place or year)" name="kicker" state={state} defaultValue={chapter?.kicker} placeholder="2016" />
            <TextField label="Title" name="title" state={state} defaultValue={chapter?.title} />
            <TextField label="Badge on the photo" name="badge" state={state} defaultValue={chapter?.badge} />
          </div>
          <TextArea label="Text" name="body" rows={4} state={state} defaultValue={chapter?.body} />
          <ImageField label="Photo (shown in black and white until the story reaches it)" name="photoUrl" folder="story" preset="storyPhoto" defaultUrl={chapter?.photoUrl} live={live} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Photo description" name="photoAlt" state={state} defaultValue={chapter?.photoAlt} />
            <TextField label="Until there’s a photo, the placeholder says" name="photoHint" state={state} defaultValue={chapter?.photoHint} />
            <TextField label="Link (optional)" name="linkHref" state={state} defaultValue={chapter?.linkHref} placeholder="/about/dr-ali-shihab-sabbir" />
            <TextField label="Link text" name="linkLabel" state={state} defaultValue={chapter?.linkLabel} />
          </div>
          <TextField label="Id (for links)" name="slug" state={state} defaultValue={chapter?.slug} placeholder="made from the title" />
        </>
      )}
    </AdminForm>
  );
}

const socialFields = [
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["website", "Website"],
  ["email", "Email"],
] as const;

export function DeveloperForm({ developer, live }: { developer?: AdminDeveloper; live: boolean }) {
  return (
    <AdminForm action={saveDeveloper} submitLabel={developer ? "Save" : "Add"} resetOnSave={!developer}>
      {(state) => (
        <>
          {developer && <input type="hidden" name="id" value={developer.id} />}
          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Name" name="name" state={state} defaultValue={developer?.name} />
            <TextField label="What they built" name="role" state={state} defaultValue={developer?.role} placeholder="Core Developer" />
            <TextField label="JUKTI designation" name="designation" state={state} defaultValue={developer?.designation} placeholder="Webmaster, JUKTI" />
          </div>
          <ImageField label="Portrait" name="photoUrl" folder="developers" preset="developer" defaultUrl={developer?.photoUrl} live={live} />
          <div className="grid gap-4 md:grid-cols-3">
            {socialFields.map(([key, label]) => (
              <TextField key={key} label={label} name={`social_${key}`} state={state} defaultValue={developer?.socials[key]} placeholder={key === "email" ? "name@example.com" : "https://…"} />
            ))}
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function BoardTermForm({ term }: { term: string }) {
  return (
    <AdminForm action={saveBoardTerm} submitLabel="Save term">
      {(state) => <TextField label="Executive Board term (shown on /team)" name="term" state={state} defaultValue={term} className="max-w-xs" />}
    </AdminForm>
  );
}

export function SocialsForm({ socials }: { socials: Socials }) {
  return (
    <AdminForm action={saveSocials} submitLabel="Save links">
      {(state) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Facebook" name="facebook" state={state} defaultValue={socials.facebook} />
          <TextField label="Instagram" name="instagram" state={state} defaultValue={socials.instagram} />
          <TextField label="LinkedIn" name="linkedin" state={state} defaultValue={socials.linkedin} />
          <TextField label="Public email" name="email" type="email" state={state} defaultValue={socials.email} hint={<span className="text-[0.75rem] text-muted">Shown on the site</span>} />
        </div>
      )}
    </AdminForm>
  );
}

/** The memorial page's tribute, timeline, research areas and photos (Master Admin). */
export function MemorialForm({ content, live }: { content: MemorialContent; live: boolean }) {
  const [photos, setPhotos] = useState(content.photos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropping, setCropping] = useState<File | null>(null);

  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    setError(null);
    setCropping(file);
  };

  const addPhoto = async (result: Cropped) => {
    setCropping(null);
    setUploading(true);
    try {
      const up = await uploadBlob(result, "memorial");
      setPhotos((p) => [...p, { src: up.url, alt: "", width: up.width, height: up.height }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminForm action={saveMemorial} submitLabel="Save memorial page">
      {(state) => (
        <>
          <TextArea label="Tribute" name="tribute" rows={14} state={state} defaultValue={content.tribute.join("\n\n")} hint={<span className="text-[0.75rem] text-muted">A blank line between paragraphs</span>} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Farewell line" name="farewell" state={state} defaultValue={content.farewell} />
            <TextField label="IUB notice quote" name="notice" state={state} defaultValue={content.notice} />
          </div>
          <TextArea
            label="Timeline"
            name="life"
            rows={10}
            mono
            state={state}
            defaultValue={content.life.map((e) => [e.year, e.title, e.detail].join(" | ")).join("\n")}
            hint={<span className="text-[0.75rem] text-muted">One line each: year | title | detail</span>}
          />
          <TextArea label="Research areas" name="interests" rows={5} state={state} defaultValue={content.interests.join("\n")} hint={<span className="text-[0.75rem] text-muted">One per line</span>} />

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[0.85rem] text-muted">Photos (in this order)</legend>
            <input type="hidden" name="photos" value={JSON.stringify(photos)} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p, i) => (
                <li key={`${p.src}-${i}`} className="overflow-hidden rounded-[14px] border border-glass-border">
                  <div className="relative aspect-[4/3] bg-white/[0.04]">
                    <img src={p.src} alt="" className="absolute inset-0 size-full object-cover" />
                  </div>
                  <div className="grid gap-2 p-3">
                    <input
                      value={p.alt}
                      onChange={(e) => setPhotos((list) => list.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                      placeholder="Describe the photo"
                      aria-label="Photo description"
                      className={cn(inputClass, "h-9 text-[0.85rem]")}
                    />
                    <div className="flex gap-2 text-[0.8rem]">
                      <button type="button" disabled={i === 0} onClick={() => setPhotos((l) => swap(l, i, i - 1))} className="rounded-full border border-glass-border px-3 py-1 disabled:opacity-40">
                        ←
                      </button>
                      <button type="button" disabled={i === photos.length - 1} onClick={() => setPhotos((l) => swap(l, i, i + 1))} className="rounded-full border border-glass-border px-3 py-1 disabled:opacity-40">
                        →
                      </button>
                      <button type="button" onClick={() => setPhotos((l) => l.filter((_, j) => j !== i))} className="ml-auto rounded-full border border-[#ff8f7a]/40 px-3 py-1 text-[#ffb4a6]">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {live ? (
              <label className={cn("btn-pill btn-ghost h-9 w-fit cursor-pointer px-4 text-[0.75rem]", uploading && "pointer-events-none opacity-60")}>
                {uploading ? "Uploading…" : "Add a photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.currentTarget)} />
              </label>
            ) : (
              <p className="text-[0.85rem] text-muted">Adding photos needs Supabase.</p>
            )}
            {error && <p className="text-[0.85rem] text-[#ff8f7a]">{error}</p>}
            {cropping && <ImageCropper file={cropping} preset={imagePresets.memorialPhoto} onCancel={() => setCropping(null)} onDone={addPhoto} />}
            {state.fieldErrors?.photos && <p className="text-[0.85rem] text-[#ff8f7a]">{state.fieldErrors.photos}</p>}
          </fieldset>
        </>
      )}
    </AdminForm>
  );
}

function swap<T>(list: T[], i: number, j: number) {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
