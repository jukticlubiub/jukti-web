import "server-only";
import { supabaseEnv } from "@/lib/supabase/config";
import type { createSessionClient } from "@/lib/supabase/server";

type Session = Awaited<ReturnType<typeof createSessionClient>>;

/*
 * Images linked from other sites (a Facebook post, Google Drive...) are copied into our own
 * `media` bucket, so the site never depends on them: Facebook's image links expire after a
 * few weeks, and next/image only serves images from our own storage.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** Already ours: a file in our Supabase storage, or one shipped with the site (/team/...). */
export function isOurImage(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!supabaseEnv) return false;
  try {
    return new URL(url).host === new URL(supabaseEnv.url).host;
  } catch {
    return false;
  }
}

export class ImageCopyError extends Error {}

/** Downloads an image from another site and stores a copy in `media/<folder>/`; returns the copy's public URL. */
export async function copyRemoteImage(db: Session, url: string, folder: string): Promise<string> {
  let source: URL;
  try {
    source = new URL(url);
  } catch {
    throw new ImageCopyError("That isn’t a web link to an image.");
  }
  // Admin-only, but still: public web addresses only, nothing on the server's own network.
  if (source.protocol !== "https:" || source.hostname === "localhost" || /^[\d.]+$|^\[|:/.test(source.hostname)) {
    throw new ImageCopyError("Use an https:// link to the image.");
  }

  let response: Response;
  try {
    response = await fetch(source, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "image/*" } });
  } catch {
    throw new ImageCopyError("That image couldn’t be downloaded. Save it to your computer and upload it instead.");
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!response.ok || !ext) {
    throw new ImageCopyError(
      response.ok
        ? "That link isn’t an image (a link to a post or a page won’t work). Open the image itself and copy its address, or upload the file."
        : "That image couldn’t be downloaded (the link may have expired). Save it to your computer and upload it instead.",
    );
  }
  if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) throw new ImageCopyError("That image is over 10 MB. Upload a smaller copy.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new ImageCopyError("That image is over 10 MB. Upload a smaller copy.");

  const dir = folder.replace(/[^a-z0-9/-]/gi, "").replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "") || "imported";
  const path = `${dir}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("media").upload(path, bytes, { contentType: type, cacheControl: "31536000" });
  if (error) throw new ImageCopyError(error.message.includes("security") ? "Your role can’t upload images." : "Copying the image failed. Please try again.");
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** For save actions: our own image as is; an image from another site copied into our storage first. */
export async function keepImage(db: Session, url: string | null, folder: string): Promise<string | null> {
  if (!url || isOurImage(url)) return url;
  return copyRemoteImage(db, url, folder);
}

/** keepImage for a save action: the address to store, or the message to show when copying failed. */
export async function keepImageOr(db: Session, url: string | null, folder: string): Promise<{ url: string | null } | { error: string }> {
  try {
    return { url: await keepImage(db, url, folder) };
  } catch (e) {
    return { error: e instanceof ImageCopyError ? e.message : "Copying the image failed. Please try again." };
  }
}
