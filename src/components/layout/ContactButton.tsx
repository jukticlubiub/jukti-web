"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ChatIcon } from "@/components/ui/icons";

/**
 * A small round "Contact us" button in the bottom-left corner of every page (except the
 * Contact page itself). On hover or keyboard focus it opens out to show its label.
 */
export function ContactButton() {
  // The current page is only known at request time on some routes, so the check streams in.
  return (
    <Suspense fallback={<FloatingContact />}>
      <ContactButtonUnlessContactPage />
    </Suspense>
  );
}

function ContactButtonUnlessContactPage() {
  return usePathname() === "/contact" ? null : <FloatingContact />;
}

function FloatingContact() {
  return (
    <Link
      href="/contact"
      aria-label="Contact us"
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 flex h-12 items-center rounded-full border border-flare/55 bg-black/60 px-[13px] text-flare shadow-[0_10px_32px_-10px_rgb(245_124_72/0.7)] backdrop-blur-xl transition-[background-color,color,box-shadow,border-color] duration-300 ease-ui hover:border-flare hover:bg-lava hover:text-white hover:shadow-[0_12px_36px_-8px_rgb(245_124_72/0.8)] focus-visible:bg-lava focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare"
    >
      <ChatIcon className="size-5" />
      <span className="max-w-0 overflow-hidden text-[0.85rem] font-medium whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-300 ease-ui group-hover:ml-2 group-hover:max-w-[7rem] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[7rem] group-focus-visible:opacity-100">
        Contact us
      </span>
    </Link>
  );
}
