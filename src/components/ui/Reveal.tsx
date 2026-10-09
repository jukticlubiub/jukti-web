"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "p" | "h2" | "li";
  /** Play on page load instead of on scrolling into view (for content at the top of a page). */
  immediate?: boolean;
};

/** Rise-and-fade on first entering the viewport. Reduced motion shows it in place. */
export function Reveal({ children, className, delay = 0, as = "div", immediate = false }: RevealProps) {
  const Tag = motion[as];
  const shown = { opacity: 1, y: 0 };
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={immediate ? shown : undefined}
      whileInView={immediate ? undefined : shown}
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
 */
export function MaskReveal({ children, className }: { children: React.ReactNode; className?: string }) {
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
