"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/**
 * After creating something, opens its page (`href` is built from the new id), saying so while
 * the page loads: admin pages render on the server, so it can take a moment.
 */
export function OpenCreated({ id, href, label = "Opening it…" }: { id?: string; href: (id: string) => string; label?: string }) {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  useEffect(() => {
    if (id) startOpening(() => router.push(href(id)));
  }, [id, href, router]);
  if (!opening) return null;
  return (
    <p role="status" className="flex items-center gap-2.5 rounded-[12px] border border-flare/30 bg-lava/10 px-4 py-3 text-[0.92rem] text-fg">
      <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-flare/30 border-t-flare" />
      Saved. {label}
    </p>
  );
}
