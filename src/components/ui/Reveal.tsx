"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "p" | "h2" | "li";
  /**
   * Play on page load instead of on scrolling into view (for content at the top of a page).
   * A CSS animation, so it plays from the first paint instead of waiting for the page's
   * JavaScript: content at the top shows up sooner.
   */
  immediate?: boolean;
};

/** Rise-and-fade on first entering the viewport. Reduced motion shows it in place. */
export function Reveal({ children, className, delay = 0, as = "div", immediate = false }: RevealProps) {
  if (immediate) {
    const Plain = as;
    return (
      <Plain
        className={`animate-[reveal-up_0.7s_var(--ease-reveal)_both] motion-reduce:animate-none ${className ?? ""}`}
        style={delay ? { animationDelay: `${delay}s` } : undefined}
      >
        {children}
      </Plain>
    );
  }
  return <RevealOnScroll className={className} delay={delay} as={as}>{children}</RevealOnScroll>;
}

function RevealOnScroll({ children, className, delay = 0, as = "div" }: Omit<RevealProps, "immediate">) {
  const Tag = motion[as];
  const shown = { opacity: 1, y: 0 };
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={shown}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </Tag>
  );
}

/**
 * Heading that slides up from behind a mask when it scrolls into view. The mask is
 * what's watched: the text itself starts fully hidden below it, so it never
 * "intersects" on its own (especially headings that wrap onto several lines).
 * `immediate`: on page load, as a CSS animation (see Reveal).
 */
export function MaskReveal({ children, className, immediate = false }: { children: React.ReactNode; className?: string; immediate?: boolean }) {
  if (immediate) {
    return (
      <span className={`block overflow-y-clip pb-[0.08em] ${className ?? ""}`}>
        <span className="block animate-[mask-rise_0.9s_var(--ease-reveal)_both] motion-reduce:animate-none">{children}</span>
      </span>
    );
  }
  return <MaskRevealOnScroll className={className}>{children}</MaskRevealOnScroll>;
}

function MaskRevealOnScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const mask = useRef<HTMLSpanElement>(null);
  const inView = useInView(mask, { once: true, margin: "0px 0px -10% 0px" });
  return (
    // Clips only top and bottom, so the display font's last letter isn't shaved off at the side.
    <span ref={mask} className={`block overflow-y-clip pb-[0.08em] ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        animate={inView ? { y: 0 } : undefined}
        transition={{ duration: 0.9, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}
