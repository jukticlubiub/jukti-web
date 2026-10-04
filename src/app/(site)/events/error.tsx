"use client";

import { useEffect } from "react";

export default function EventsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl px-5 pt-[clamp(10rem,16vw,16rem)] pb-32 text-center">
      <h1 className="font-heading text-[clamp(1.8rem,3.4vw,3.2rem)]">Events are unavailable</h1>
      <p className="mt-5 text-lg text-body">We couldn’t load the events just now. Please try again in a moment.</p>
      <button type="button" onClick={() => retry()} className="btn-pill btn-primary mt-8">
        Try again
      </button>
    </section>
  );
}
