import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, Eyebrow, StatusPill } from "@/components/members/AccountHeader";
import { MemberCard } from "@/components/members/MemberCard";
import { requireMember } from "@/lib/members/account";
import { cardToken, qrSvg } from "@/lib/members/card";

export const metadata: Metadata = { title: "Member card", robots: { index: false } };

export default function CardPage() {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <AccountHeader title="MEMBER" accent="CARD" subtitle="Show it at the door to check in." active="/account/card" />
      <div className="relative mx-auto max-w-[44rem] px-5 pt-[clamp(3rem,5vw,5rem)]">
        <Suspense fallback={<div aria-hidden className="aspect-[1.586] rounded-[24px] border border-glass-border bg-glass motion-safe:animate-pulse" />}>
          <CardBody />
        </Suspense>
      </div>
    </div>
  );
}

async function CardBody() {
  const { member } = await requireMember();

  if (member.status !== "approved") {
    return (
      <div className="glass-card p-7 text-center sm:p-9">
        <StatusPill status={member.status} />
        <h2 className="mt-4 font-heading text-[clamp(1.3rem,2.2vw,1.8rem)]">Your card appears once you’re approved</h2>
        <p className="mx-auto mt-3 max-w-md text-body/85">
          {member.status === "pending"
            ? "An executive is checking your payment. We’ll email you when your card is ready."
            : "See your profile for what’s needed."}
        </p>
        <Link href="/account" className="btn-pill btn-ghost mt-7">
          Back to your profile
        </Link>
      </div>
    );
  }

  const token = cardToken(member.id);
  const qr = token ? await qrSvg(token) : null;

  return (
    <div className="grid gap-8">
      <MemberCard member={member} qr={qr} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>At events</Eyebrow>
          <p className="mt-1.5 max-w-md text-[0.95rem] leading-relaxed text-body/85">
            RSVP as usual, then show this QR code at the door. Brighten your screen if it doesn’t scan.
          </p>
        </div>
        {qr && (
          <a href="/account/card/image" download={`jukti-card-${member.memberNo ?? member.iubId}.png`} className="btn-pill btn-ghost">
            Save as image
          </a>
        )}
      </div>
    </div>
  );
}
