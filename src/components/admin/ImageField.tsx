"use client";

/* eslint-disable @next/next/no-img-element -- previews of freshly uploaded images, any host */
import { useId, useRef, useState } from "react";
import { type ImagePresetName, imagePresets } from "@/lib/admin/image-presets";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { inputClass } from "./forms";
import { type Cropped, ImageCropper } from "./ImageCropper";

export type Uploaded = { url: string; width: number; height: number };

const MAX_SIDE = 2000;

/** Shrinks an image to at most 2000px on its longer side and encodes it as WebP (no cropping). */
async function prepare(file: File): Promise<Cropped> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image."))), "image/webp", 0.86),
  );
  return { blob, width, height };
}

/** Uploads a prepared image to the public `media` bucket (as the signed-in admin). */
export async function uploadBlob({ blob, width, height }: Cropped, folder: string): Promise<Uploaded> {
  const supabase = createBrowserSupabase();
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(error.message.includes("security") ? "Your role can't upload images." : "The upload failed. Please try again.");
  return { url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl, width, height };
}

/** Resizes (without cropping) and uploads an image: for gallery photos, which keep their own shape. */
export async function uploadImage(file: File, folder: string): Promise<Uploaded> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  return uploadBlob(await prepare(file), folder);
}

/**
 * An image picker for a form. Choosing a photo opens the cropper, framed to the card it's
 * used in (`preset`), then uploads it; "Re-crop" frames the current image again. The URL
 * goes into a hidden input `name`. Without Supabase (preview mode) the cropped image is
 * only shown here, not uploaded.
 */
export function ImageField({
  label,
  name,
  folder,
  preset,
  defaultUrl,
  live,
}: {
  label: string;
  name: string;
  folder: string;
  preset: ImagePresetName;
  defaultUrl?: string | null;
  live: boolean;
}) {
  const id = useId();
  const config = imagePresets[preset];
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [cropping, setCropping] = useState<Blob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    setError(null);
    setCropping(file);
  };

  const recrop = async () => {
    setError(null);
    setBusy("Loading…");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setCropping(await res.blob());
    } catch {
      setError("That image couldn’t be loaded for cropping. Upload the file instead.");
    } finally {
      setBusy(null);
    }
  };

  const onCropped = async (result: Cropped) => {
    setCropping(null);
    if (!live) {
      setUrl(URL.createObjectURL(result.blob));
      setPreviewOnly(true);
      return;
    }
    setBusy("Uploading…");
    try {
      setUrl((await uploadBlob(result, folder)).url);
      setPreviewOnly(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(null);
    }
  };

  const firstShape = config.shapes[0];
  return (
    <div>
      <p className="mb-1.5 text-[0.85rem] text-muted">{label}</p>
      <input type="hidden" name={name} value={previewOnly ? "" : url} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden border border-glass-border bg-white/[0.03]",
            "round" in config && config.round ? "max-w-[7rem] rounded-full" : "rounded-[12px]",
            firstShape.aspect && firstShape.aspect < 1 ? "max-w-[9rem]" : "max-w-[16rem]",
          )}
          style={{ aspectRatio: firstShape.aspect ?? 16 / 10 }}
        >
          {url ? <img src={url} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[0.8rem] text-muted">No image</span>}
        </div>
        <div className="grid flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className={cn("btn-pill btn-ghost h-9 cursor-pointer px-4 text-[0.75rem]", busy && "pointer-events-none opacity-60")}>
              {busy ?? (url ? "Replace image" : "Choose image")}
            </label>
            <input ref={fileRef} id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            {url && !busy && (
              <>
                <button type="button" onClick={recrop} className="h-9 rounded-full border border-glass-border px-3 text-[0.75rem] text-body hover:text-fg">
                  Re-crop
                </button>
                <button type="button" onClick={() => setUrl("")} className="text-[0.82rem] text-muted hover:text-fg">
                  Remove
                </button>
              </>
            )}
          </div>
          <p className="text-[0.78rem] text-muted">
            You’ll frame it for {firstShape.label.toLowerCase()}
            {firstShape.aspect ? ` (${shapeName(firstShape.aspect)})` : ""} before it’s saved.
          </p>
          <input
            aria-label={`${label} URL`}
            value={previewOnly ? "" : url}
            onChange={(e) => {
              setUrl(e.target.value.trim());
              setPreviewOnly(false);
            }}
            placeholder="…or paste an image URL"
            className={cn(inputClass, "h-10 text-[0.9rem]")}
          />
          {previewOnly && <p className="text-[0.8rem] text-sky-200">Preview mode: cropped here, but not uploaded (that needs Supabase).</p>}
          {error && <p className="text-[0.85rem] text-[#ff8f7a]">{error}</p>}
        </div>
      </div>
      {cropping && <ImageCropper file={cropping} preset={config} onCancel={() => setCropping(null)} onDone={onCropped} />}
    </div>
  );
}

function shapeName(aspect: number) {
  const known: [number, string][] = [
    [1, "square"],
    [16 / 10, "16:10"],
    [4 / 3, "4:3"],
    [4 / 5, "4:5"],
    [2 / 3, "2:3"],
  ];
  return known.find(([a]) => Math.abs(a - aspect) < 0.01)?.[1] ?? "portrait";
}
