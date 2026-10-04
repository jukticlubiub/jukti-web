import "server-only";
import { connection } from "next/server";

/**
 * The time of the current request. Makes the calling component render per request
 * (so wrap it in <Suspense>): which events are on now can't be decided at build time.
 */
export async function requestTime() {
  await connection();
  return Date.now();
}
