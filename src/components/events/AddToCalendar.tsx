"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CalendarIcon, ChevronIcon } from "@/components/ui/icons";

/** "Add to calendar" with a small menu: Google Calendar, or an .ics file for everything else. */
export function AddToCalendar({
  googleUrl,
  icsPath,
  className,
  align = "left",
}: {
  googleUrl: string;
  icsPath: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex items-center justify-between gap-6 rounded-[12px] px-3.5 py-3 text-[0.95rem] text-body transition-colors hover:bg-white/[0.06] hover:text-fg";

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="btn-pill btn-ghost w-full text-[0.85rem]"
      >
        <CalendarIcon />
        Add to calendar
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "absolute top-[calc(100%+0.5rem)] z-30 w-60 origin-top rounded-[18px] border border-glass-border bg-[#120a07]/90 p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
              Google Calendar
              <ChevronIcon className="text-muted" />
            </a>
            <a href={icsPath} download className={item} onClick={() => setOpen(false)}>
              Apple, Outlook (.ics)
              <ChevronIcon className="text-muted" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
