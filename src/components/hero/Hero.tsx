"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { peekDistance } from "@/components/juro/peek";
import { PillButton } from "@/components/ui/PillButton";
import { site } from "@/lib/site";
import { HeroBackdrop } from "./HeroBackdrop";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * A line of the title that slides up from behind a mask. The mask clips only top and bottom:
 * the display font's last letter draws a little past its box (tight tracking and the
 * outline stroke), and clipping sideways would shave it off. A CSS animation, so it plays
 * from the first paint instead of waiting for the page's JavaScript.
 */
function TitleLine({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className={`block overflow-y-clip pt-[0.04em] pb-[0.08em] ${className ?? ""}`}>
      <span className="block animate-[hero-rise_1.1s_var(--ease-reveal)_both] motion-reduce:animate-none" style={{ animationDelay: `${delay}s` }}>
        {children}
      </span>
    </span>
  );
}

/**
 * Homepage hero from the design: title, tagline and CONTACT US above the eclipse.
 * Sizes are measured from the 1863px-wide design and scale with the hero's width
 * (`cqw`); the content block's bottom sits a fixed gap above the planet's top.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const progress = useRef(0);

  useGSAP(
    () => {
      // Hold the hero still for the first stretch of scrolling while Juro leaves his big
      // opening peek for his path down the page (see juro/peek.ts). Created first so the
      // triggers below account for the extra scroll it adds.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: () => `+=${peekDistance()}`,
        pin: true,
        invalidateOnRefresh: true,
      });

      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });

      // Then the title lifts away and fades as the page scrolls on. ScrollTrigger already
      // pushes this trigger's positions back by the pin above, so "top top" is when the
      // pin ends (adding peekDistance() here would count the pin twice).
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(content.current, {
          yPercent: -22,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${(root.current?.offsetHeight ?? 0) * 0.65}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });
    },
    { scope: root },
  );

  // The pin wraps the section in a GSAP "pin-spacer". This div stays the section's
  // React-owned parent, so the spacer never becomes a direct child of <main>, where
  // React inserts the next page when navigating away (Next keeps this page mounted,
  // hidden, in an <Activity>).
  return (
    <div>
      <section ref={root} aria-labelledby="hero-title" className="@container relative h-svh">
        <HeroBackdrop progress={progress} />

        <div
          ref={content}
          className="relative z-10 flex h-[clamp(56svh,39.5cqw,72svh)] flex-col items-center justify-end px-5 pb-[max(2rem,6.9cqw)] text-center"
        >
          <h1 id="hero-title" className="font-heading inline-flex flex-col items-end text-[clamp(2.2rem,6.15cqw,8rem)]">
            <TitleLine delay={0.25} className="-mb-[0.3em] text-[0.355em]">
              {/* The space keeps the heading's text "Welcome to the JUKTIverse" (the lines are separate blocks). */}
              Welcome to the{" "}
            </TitleLine>
            <TitleLine delay={0.1}>JUKTIverse</TitleLine>
          </h1>

          <p className="mt-[0.35em] animate-[hero-fade-up_0.9s_var(--ease-reveal)_0.55s_both] text-[clamp(1.05rem,2.06cqw,2.5rem)] leading-tight font-light tracking-[-0.025em] text-fg motion-reduce:animate-none">
            {site.tagline}
          </p>

          <div className="mt-[clamp(1.25rem,2.1cqw,2.5rem)] flex animate-[hero-fade-up_0.9s_var(--ease-reveal)_0.7s_both] motion-reduce:animate-none">
            <PillButton href="/contact" className="px-[0.95em] py-[0.42em] text-[clamp(0.95rem,1.3cqw,1.5rem)]">
              Contact us
            </PillButton>
          </div>
        </div>
      </section>
    </div>
  );
}
