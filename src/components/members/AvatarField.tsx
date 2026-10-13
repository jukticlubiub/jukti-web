"use client";

import { useId, useRef, useState } from "react";
import { type Cropped, ImageCropper } from "@/components/admin/ImageCropper";
import { imagePresets } from "@/lib/admin/image-presets";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Avatar } from "./AccountHeader";

/** The storage bucket refuses anything bigger. */
const MAX_BYTES = 1024 * 1024;

/** Re-encodes at lower quality until it fits in 1 MB (cropped photos almost always do already). */
async function fit(result: Cropped): Promise<Blob> {
  if (result.blob.size <= MAX_BYTES) return result.blob;
  const bitmap = await createImageBitmap(result.blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  for (const quality of [0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("That photo is too large even after compressing. Try a different one.");
}

/**
 * The member's photo: pick one, frame it in the round cropper, and it's uploaded to their
 * own folder in the `avatars` bucket (at most 1 MB). The URL goes in a hidden `photo_url`
 * input, saved with the form. Without Supabase (preview) it's only shown here.
 */
export function AvatarField({ userId, name, defaultUrl, live, error }: { userId: string; name: string; defaultUrl: string | null; live: boolean; error?: string }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [shown, setShown] = useState(defaultUrl ?? "");
  const [cropping, setCropping] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setProblem("Choose a photo (JPG, PNG or WebP).");
    setProblem(null);
    setCropping(file);
  };

  const save = async (result: Cropped) => {
    setCropping(null);
    setBusy(true);
    try {
      const blob = await fit(result);
      if (!live) {
        setShown(URL.createObjectURL(blob));
        // Not uploaded in preview; a stand-in address, since a photo is required.
        setUrl("https://example.com/preview-photo.webp");
        return;
      }
      const supabase = createBrowserSupabase();
      // One file per member, replaced in place; the ?v= makes browsers fetch the new one.
      const path = `${userId}/photo.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message.includes("exceeded") ? "That photo is over 1 MB." : "The upload failed. Please try again.");
      const publicUrl = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      setUrl(publicUrl);
      setShown(publicUrl);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "The upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-[0.85rem] text-muted">
        Photo <span className="text-[0.75rem]">(required)</span>
      </p>
      <input type="hidden" name="photo_url" value={url} />
      <div className="flex items-center gap-4">
        <Avatar name={name} url={shown || null} className="size-20 text-[3rem]" />
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className={cn("btn-pill btn-ghost h-9 cursor-pointer px-4 text-[0.75rem]", busy && "pointer-events-none opacity-60")}>
              {busy ? "Uploading…" : shown ? "Change photo" : "Add a photo"}
            </label>
            <input ref={fileRef} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <p className="text-[0.78rem] text-muted">A clear photo of your face (every member needs one). You’ll crop it to a circle; it’s saved under 1 MB.</p>
        </div>
      </div>
      {!live && shown && <p className="mt-2 text-[0.8rem] text-sky-200">Preview mode: shown here, but not uploaded (that needs Supabase).</p>}
      {(problem || error) && <p className="mt-2 text-[0.85rem] text-[#ff8f7a]">{problem ?? error}</p>}
      {cropping && <ImageCropper file={cropping} preset={imagePresets.memberAvatar} onCancel={() => setCropping(null)} onDone={save} />}
    </div>
  );
}
