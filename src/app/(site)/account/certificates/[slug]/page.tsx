import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { PrintButton } from "@/components/members/PrintButton";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { formatDay } from "@/lib/events/time";
import { requireMember } from "@/lib/members/account";
import { getActivity } from "@/lib/members/activity";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Certificate", robots: { index: false } };

/** Printing shows only the certificate, on one landscape A4 page. */
const printStyles = `
@page { size: A4 landscape; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #certificate, #certificate * { visibility: visible !important; }
  #certificate { position: fixed !important; inset: 0 !important; width: 100vw !important; max-width: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
}`;

export default function CertificatePage({ params }: PageProps<"/account/certificates/[slug]">) {
  return (
    <div className="relative px-5 pt-[clamp(7rem,10vw,10rem)] pb-[clamp(4rem,7vw,7rem)]">
      <Suspense fallback={<div aria-hidden className="mx-auto aspect-[1.414] max-w-[64rem] rounded-[16px] bg-glass motion-safe:animate-pulse" />}>
        <Certificate params={params} />
      </Suspense>
    </div>
  );
}

async function Certificate({ params }: Pick<PageProps<"/account/certificates/[slug]">, "params">) {
  const [{ slug }, { mode, user, member }] = await Promise.all([params, requireMember()]);
  const { events } = await getActivity(mode, user.id);
  const attended = events.find((a) => a.event.slug === slug && a.checkedInAt);
  if (!attended) notFound();
  const { event } = attended;
  const certificateId = `${(member.memberNo ?? member.iubId).replace(/[^A-Z0-9]/gi, "")}-${event.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <style>{printStyles}</style>
      <div className="mx-auto mb-6 flex max-w-[64rem] flex-wrap items-center justify-between gap-3">
        <Link href="/account/activity" className="inline-flex items-center gap-2 text-[0.92rem] text-muted hover:text-fg">
          <ArrowLeftIcon className="size-4" />
          Your activity
        </Link>
        <PrintButton className="btn-pill btn-primary">Print or save as PDF</PrintButton>
      </div>

      <article
        id="certificate"
        aria-label={`Certificate of participation: ${event.title}`}
        className="@container relative mx-auto aspect-[1.414] w-full max-w-[64rem] overflow-clip rounded-[16px] bg-[#fbf8f4] text-[#1a100b] shadow-[0_40px_120px_-40px_rgb(200_74_26/0.5)] [print-color-adjust:exact]"
      >
        <div aria-hidden className="absolute inset-[2.2cqw] rounded-[0.6cqw] border-[0.25cqw] border-[#c84a1a]" />
        <div aria-hidden className="absolute inset-[3cqw] rounded-[0.4cqw] border border-[#c84a1a]/35" />
        <span aria-hidden className="absolute -right-[6cqw] -bottom-[8cqw] w-[38cqw] text-[#c84a1a]/[0.07]">
          <LogoMark className="w-full" title="" />
        </span>

        <div className="relative flex h-full flex-col items-center px-[9cqw] pt-[6.5cqw] pb-[5.5cqw] text-center">
          <Logo className="w-[19cqw] text-[#1a100b]" />
          <p className="mt-[4cqw] text-[1.5cqw] tracking-[0.5em] text-[#c84a1a] uppercase">Certificate of participation</p>
          <p className="mt-[3cqw] text-[1.7cqw] text-[#6b5a50]">This certifies that</p>
          <p className="mt-[1.2cqw] font-heading text-[4.6cqw] leading-tight text-[#1a100b]!">{member.name}</p>
          <p className="mt-[0.6cqw] text-[1.4cqw] text-[#6b5a50] tabular-nums">IUB ID {member.iubId}</p>
          <p className="mt-[2.4cqw] max-w-[70cqw] text-[1.8cqw] leading-relaxed text-[#3d2c23]">
            took part in <strong className="font-semibold text-[#1a100b]">{event.title}</strong>, held on {formatDay(event.startsAt)} at {event.venue},
            organised by {site.fullName}.
          </p>

          <div className="mt-auto grid w-full grid-cols-3 items-end gap-[4cqw] text-[1.25cqw] text-[#6b5a50]">
            <div className="border-t border-[#1a100b]/40 pt-[0.8cqw]">President, {site.name}</div>
            <div className="text-[1.05cqw] tracking-[0.12em] tabular-nums">No. {certificateId}</div>
            <div className="border-t border-[#1a100b]/40 pt-[0.8cqw]">Faculty Advisor</div>
          </div>
        </div>
      </article>
      {mode === "preview" && (
        <p className="mx-auto mt-6 max-w-[64rem] text-[0.8rem] text-muted">Preview mode: this sample uses the most recent past event as if you attended it.</p>
      )}
    </>
  );
}
