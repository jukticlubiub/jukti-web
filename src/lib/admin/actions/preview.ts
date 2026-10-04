"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { adminMode, PREVIEW_ROLES_COOKIE } from "../access";
import { adminRoles } from "../roles";

/** Preview mode only: which roles the pretend admin has, to try each role's panel. */
export async function setPreviewRoles(formData: FormData) {
  if (adminMode() !== "preview") return;
  const picked = formData.getAll("role").map(String).filter((r) => (adminRoles as readonly string[]).includes(r));
  (await cookies()).set(PREVIEW_ROLES_COOKIE, (picked.length ? picked : ["master_admin"]).join(","), {
    path: "/admin",
    sameSite: "lax",
    httpOnly: true,
  });
  refresh();
}
