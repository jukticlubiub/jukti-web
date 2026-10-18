"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, CopyIcon, GoogleIcon, MailIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const item =
  "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[0.9rem] text-body transition-colors hover:bg-white/[0.07] hover:text-fg focus-visible:bg-white/[0.07] focus-visible:text-fg focus-visible:outline-none";

/** Keep the menu this far from the screen edges, and this far from the button. */
const EDGE = 16;
const GAP = 8;

/**
 * An email address people can act on. A plain mailto: link does nothing for people who use Gmail
 * in the browser (no mail app set up), so this opens a small menu instead: write in Gmail, open
 * the mail app, or copy the address. `children` is what's clicked (an icon, the address, a label).
 *
 * The menu is a native popover: it's drawn above the whole page (an ordinary dropdown inside an
 * animated wrapper gets trapped under the next section) and closes on Escape or a click outside.
 * Browsers without popovers get a plain mailto: link.
 */
export function EmailMenu({
  email,
  label,
  className,
  children,
}: {
  email: string;
  /** Accessible name for the trigger, when its contents don't say it (e.g. an icon). */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [supported, setSupported] = useState(true);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after hydration
    if (!("popover" in HTMLElement.prototype)) setSupported(false);
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (!menu || !button) return;
    // Under the button (or above it when there's no room), kept inside the screen. Before it opens
    // the menu has no size yet, so it's placed with its CSS width and a typical height, then refined.
    const place = () => {
      const b = button.getBoundingClientRect();
      const width = menu.offsetWidth || Math.min(240, window.innerWidth - 2 * EDGE);
      const height = menu.offsetHeight || 160;
      const left = Math.min(Math.max(EDGE, b.left + b.width / 2 - width / 2), window.innerWidth - EDGE - width);
      const below = b.bottom + GAP;
      const top = below + height > window.innerHeight - EDGE && b.top - GAP - height > EDGE ? b.top - GAP - height : below;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    };
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === "open";
      if (open) {
        place();
        window.addEventListener("scroll", place, { passive: true, capture: true });
        window.addEventListener("resize", place);
      } else {
        window.removeEventListener("scroll", place, { capture: true });
        window.removeEventListener("resize", place);
        setCopied(false);
      }
    };
    // Placed before it's shown (no flash in the corner), and again once it's open and measurable.
    const onBeforeToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") place();
    };
    menu.addEventListener("beforetoggle", onBeforeToggle);
    menu.addEventListener("toggle", onToggle);
    return () => {
      menu.removeEventListener("beforetoggle", onBeforeToggle);
      menu.removeEventListener("toggle", onToggle);
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [supported]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // Clipboard blocked: the address is shown in the menu to select by hand.
    }
  };
  const close = () => menuRef.current?.hidePopover();

  if (!supported) {
    return (
      <a href={`mailto:${email}`} title={email} aria-label={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <>
      <button ref={buttonRef} type="button" popoverTarget={menuId} title={email} aria-label={label} className={cn("cursor-pointer text-left", className)}>
        {children}
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        aria-label={`Email ${email}`}
        className="fixed inset-auto m-0 w-[min(15rem,calc(100vw-2rem))] rounded-[14px] border border-glass-border bg-[#171210]/95 p-1.5 text-left text-fg shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md"
      >
        <p className="truncate px-3 pt-1.5 pb-2 text-[0.8rem] text-muted select-all">{email}</p>
        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`} target="_blank" rel="noopener noreferrer" onClick={close} className={item}>
          <GoogleIcon className="size-5" />
          Write in Gmail
        </a>
        <a href={`mailto:${email}`} onClick={close} className={item}>
          <MailIcon className="size-5" />
          Open mail app
        </a>
        <button type="button" onClick={copy} className={cn(item, copied && "text-emerald-300 hover:text-emerald-300")}>
          {copied ? <CheckIcon className="size-5" /> : <CopyIcon className="size-5" />}
          {copied ? "Copied" : "Copy address"}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Email address copied" : ""}
        </span>
      </div>
    </>
  );
}
