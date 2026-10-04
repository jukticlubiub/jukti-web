"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon, ShareIcon } from "./icons";

/** Opens the system share sheet where there is one, otherwise copies the link. */
export function ShareButton({ title, path, className }: { title: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" onClick={share} className={cn("btn-pill btn-ghost text-[0.85rem]", className)}>
      {copied ? <CheckIcon className="text-flare" /> : <ShareIcon />}
      <span className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "copied" : "share"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="block"
          >
            {copied ? "Link copied" : "Share"}
          </motion.span>
        </AnimatePresence>
      </span>
      <span role="status" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}
