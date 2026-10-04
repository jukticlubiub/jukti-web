"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** After creating something, opens its page (`href` is built from the new id). */
export function OpenCreated({ id, href }: { id?: string; href: (id: string) => string }) {
  const router = useRouter();
  useEffect(() => {
    if (id) router.push(href(id));
  }, [id, href, router]);
  return null;
}
