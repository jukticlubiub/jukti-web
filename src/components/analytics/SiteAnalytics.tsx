"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect } from "react";

/** Pages that stay out of the numbers: the admin panel and the sign-in plumbing. */
const PRIVATE = /^\/(admin|auth)(\/|$)/;

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const eu = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu";

/**
 * Site analytics: PostHog (visitors, pageviews, clicks, heatmaps) and Vercel Speed Insights
 * (how fast pages load on real visitors' devices).
 *
 * PostHog loads only in production, only when NEXT_PUBLIC_POSTHOG_KEY is set, and only once the
 * browser is idle, so it never competes with the page's own scripts. Its calls go to this site's
 * own /ingest path (see next.config.ts), which ad blockers rarely block.
 *
 * Privacy: cookieless (no cookie banner needed), no person profiles unless someone is identified,
 * the browser's Do Not Track setting is respected, form fields are never read, and admin and
 * sign-in pages are never recorded. Session recordings are off.
 */
export function SiteAnalytics() {
  useEffect(() => {
    if (!key || process.env.NODE_ENV !== "production") return;
    const start = async () => {
      try {
        const { default: posthog } = await import("posthog-js");
        if (posthog.__loaded) return;
        posthog.init(key, {
          api_host: "/ingest",
          ui_host: eu ? "https://eu.posthog.com" : "https://us.posthog.com",
          // No cookies or local storage: visitors are told apart by a daily-rotating hash on PostHog's side.
          cookieless_mode: "always",
          person_profiles: "identified_only",
          respect_dnt: true,
          // One pageview per page, including client-side navigations.
          capture_pageview: "history_change",
          capture_pageleave: true,
          autocapture: true,
          enable_heatmaps: true,
          disable_session_recording: true,
          mask_all_text: false,
          before_send: (event) => (PRIVATE.test(window.location.pathname) ? null : event),
        });
      } catch {
        // Analytics must never break the page.
      }
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 2000);
    return () => clearTimeout(id);
  }, []);

  return <SpeedInsights beforeSend={(event) => (PRIVATE.test(new URL(event.url).pathname) ? null : event)} />;
}
