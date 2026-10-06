import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, StatusPill } from "@/components/members/AccountHeader";
import { Directory } from "@/components/members/Directory";
import { requireMember } from "@/lib/members/account";
import { getDirectory } from "@/lib/members/directory";

export const metadata: Metadata = { title: "Members directory", robots: { index: false } };

export default function MembersPage() {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <AccountHeader title="MEMBERS" accent="DIRECTORY" subtitle="Find teammates for your next contest." active="/members" />
      <div className="relative mx-auto max-w-[76rem] px-5 pt-[clamp(3rem,5vw,5rem)] lg:px-[clamp(2rem,4vw,5rem)]">
        <Suspense fallback={<div aria-hidden className="h-[24rem] rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse" />}>
          <MembersBody />
        </Suspense>
      </div>
    </div>
  );
}

async function MembersBody() {
  const account = await requireMember();
  const { member } = account;

  if (member.status !== "approved") {
    return (
      <div className="glass-card mx-auto max-w-xl p-7 text-center sm:p-9">
        <StatusPill status={member.status} />
        <h2 className="mt-4 font-heading text-[clamp(1.3rem,2.2vw,1.8rem)]">The directory is for approved members</h2>
        <p className="mt-3 text-body/85">You’ll see it once your membership is approved.</p>
        <Link href="/account" className="btn-pill btn-ghost mt-7">
          Back to your profile
        </Link>
      </div>
    );
  }

  const members = await getDirectory(account);
  return (
    <div className="grid gap-6">
      {!member.showInDirectory && (
        <p className="rounded-[18px] border border-glass-border bg-white/[0.03] px-5 py-4 text-[0.95rem] text-body">
          You’re not listed here.{" "}
          <Link href="/account" className="text-flare underline-offset-4 hover:underline">
            Turn it on in your profile
          </Link>{" "}
          so others can find you.
        </p>
      )}
      <Directory members={members} youId={member.id} />
    </div>
  );
}
