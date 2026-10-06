"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CseLogo, IubLogo } from "@/components/brand/AffiliationLogos";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { joinLink, navLinks } from "@/lib/site";
import { AccountButton, useSessionUser } from "./AccountButton";

const SCROLLED_AT_PX = 40;
const menuLinks = [{ label: "Home", href: "/" }, ...navLinks];

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The link for the current page. When several match (About Us and In Memoriam, which
 * lives under /about), the most specific one wins.
 */
function currentHref(pathname: string, hrefs: readonly string[]) {
  return hrefs.filter((href) => matches(pathname, href)).sort((a, b) => b.length - a.length)[0] ?? null;
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLLED_AT_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        data-scrolled={scrolled}
        className={cn(
          "group/bar mx-auto grid grid-cols-[1fr_auto] items-center border border-transparent transition-[max-width,margin,padding,background-color,border-color,border-radius] duration-500 ease-ui lg:grid-cols-[1fr_auto_1fr]",
          "max-w-full px-[clamp(1.25rem,3vw,3.5rem)] pt-[clamp(1.25rem,3vw,3.5rem)] pb-3",
          "data-[scrolled=true]:mt-3 data-[scrolled=true]:max-w-[min(72rem,calc(100%-1.5rem))] data-[scrolled=true]:rounded-full data-[scrolled=true]:py-2 data-[scrolled=true]:pl-6 data-[scrolled=true]:pr-2",
          "data-[scrolled=true]:border-glass-border data-[scrolled=true]:bg-black/45 data-[scrolled=true]:backdrop-blur-xl",
        )}
      >
        <Link href="/" aria-label="JUKTI home" className="w-fit text-fg">
          <Logo className="w-[clamp(120px,11.5vw,220px)] transition-[width] duration-500 ease-ui group-data-[scrolled=true]/bar:w-[112px]" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          {/* The current page is only known at request time on some routes (an event added after
              the last deploy), so the active underline streams in; the links themselves don't wait. */}
          <Suspense fallback={<NavList pathname={null} />}>
            <CurrentNavList />
          </Suspense>
        </nav>

        <div className="flex items-center justify-end gap-3">
          <AccountButton />
          <a
            href="https://iub.ac.bd/campus-life/clubs-at-iub/jukti---the-iub-cse-club"
            target="_blank"
            rel="noreferrer"
            className="hidden transition-opacity hover:opacity-80 lg:block"
          >
            <IubLogo className="w-[clamp(64px,calc(12vw-56px),170px)] transition-[width] duration-500 ease-ui group-data-[scrolled=true]/bar:w-12" />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="glass grid size-11 place-items-center rounded-full text-fg lg:hidden"
          >
            <span aria-hidden className="flex w-5 flex-col gap-1.5">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/5 self-end bg-current" />
            </span>
          </button>
        </div>
      </motion.div>

      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </header>
  );
}

function CurrentNavList() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-[clamp(1.5rem,3.4vw,4rem)] text-[clamp(1rem,1.46vw,1.75rem)] transition-[font-size] duration-500 group-data-[scrolled=true]/bar:text-base">
      {navLinks.map((link) => {
        const active = pathname !== null && currentHref(pathname, navLinks.map((l) => l.href)) === link.href;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative text-fg transition-colors duration-200 hover:text-flare",
                "after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-flare after:transition-transform after:duration-300 after:ease-reveal hover:after:scale-x-100",
                active && "after:scale-x-100",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lenis = useLenis();

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black/70 px-6 pt-6 pb-10 backdrop-blur-2xl lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Logo className="w-28 text-fg" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="glass grid size-11 place-items-center rounded-full text-2xl leading-none text-fg"
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          <MobileNavList onClose={onClose} />
          <div className="flex items-center justify-between">
            <MobileAccountLink onClose={onClose} />
            <div className="flex items-center gap-4">
              <CseLogo className="w-10" />
              <span aria-hidden className="h-9 w-px bg-fg/25" />
              <IubLogo className="w-14" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Only mounted while the drawer is open, so reading the URL never holds up the page. */
function MobileNavList({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [openedAt] = useState(pathname);

  // Close the drawer when the route changes (e.g. the back button while it's open).
  useEffect(() => {
    if (pathname !== openedAt) onClose();
  }, [pathname, openedAt, onClose]);

  return (
    <nav aria-label="Mobile" className="mt-16 flex-1">
      <ul className="space-y-6">
        {menuLinks.map((link, i) => {
          const active = currentHref(pathname, menuLinks.map((l) => l.href)) === link.href;
          return (
            <motion.li
              key={link.href}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={link.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn("font-heading text-[clamp(1.5rem,7vw,2.25rem)]", active && "text-flare")}
              >
                {link.label}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "Join Us" in the drawer, or "Your account" once signed in. */
function MobileAccountLink({ onClose }: { onClose: () => void }) {
  const user = useSessionUser();
  return (
    <Link href={user ? "/account" : joinLink.href} onClick={onClose} className="btn-pill btn-primary">
      {user ? "Your account" : joinLink.label}
    </Link>
  );
}
