import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-6 text-center">
      <div aria-hidden className="bg-ribs absolute inset-0" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-1/2 max-w-5xl rounded-full bg-ember-2/40 blur-[120px]" />
      <div className="relative">
        <LogoMark className="mx-auto mb-10 w-14 text-flare" />
        <h1 className="font-heading text-[clamp(2rem,5vw,4.5rem)]">Lost in the JUKTIverse</h1>
        <p className="mt-6 text-lg text-body">This page doesn&apos;t exist, or hasn&apos;t been built yet.</p>
        <Link href="/" className="btn-pill btn-primary mt-10">
          Back home
        </Link>
      </div>
    </main>
  );
}
