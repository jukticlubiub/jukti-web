"use server";

import { adminFor, PREVIEW_NOT_SAVED } from "../access";
import { copyRemoteImage, ImageCopyError, isOurImage } from "../remote-image";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * The image field's "paste an image URL": copies an image from another site into our storage
 * and returns the copy's address. Storage rules decide whose role may upload.
 */
export async function importImageFromUrl(url: string, folder: string): Promise<{ url: string } | { error: string }> {
  const admin = await adminFor(() => true);
  if (!admin) return { error: "Sign in to the admin panel again." };
  if (admin.mode === "preview") return { error: PREVIEW_NOT_SAVED };
  if (isOurImage(url)) return { url };
  try {
    return { url: await copyRemoteImage(await createSessionClient(), url, folder) };
  } catch (e) {
    return { error: e instanceof ImageCopyError ? e.message : "Copying the image failed. Please try again." };
  }
}
