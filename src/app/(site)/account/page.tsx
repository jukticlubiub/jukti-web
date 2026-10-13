import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, Avatar, Eyebrow, StatusPill } from "@/components/members/AccountHeader";
import { LinkGmail } from "@/components/members/LinkGmail";
import { ProfileForm } from "@/components/members/ProfileForm";
import { ArrowIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { getExecutiveCodeRequired } from "@/lib/content/queries";
import { requireMember } from "@/lib/members/account";
import { requestTime } from "@/lib/events/now";
import { resetPreview, setPreviewStatus } from "@/lib/members/actions";
import { memberStatuses } from "@/lib/members/options";
import { currentSemester, intakeLabel } from "@/lib/members/semester";
import type { Member } from "@/lib/members/types";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <AccountHeader title="YOUR" accent="ACCOUNT" subtitle="Your profile, card and activity." active="/account" />
      <Suspense fallback={<AccountSkeleton />}>
        <AccountBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountBody({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const [{ mode, user, member }, params, now, codeRequired] = await Promise.all([requireMember(), searchParams, requestTime(), getExecutiveCodeRequired()]);
  const live = mode === "live";
  const missing = [!member.secondaryEmail && "a personal email", !member.photoUrl && "a photo"].filter(Boolean) as string[];

  return (
    <div className="relative mx-auto grid max-w-[80rem] gap-8 px-5 pt-[clamp(3rem,5vw,5rem)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:px-[clamp(2rem,4vw,5rem)]">
      <aside className="grid gap-5 lg:sticky lg:top-28">
        <div className="glass-card p-6 text-center">
          <Avatar name={member.name} url={member.photoUrl ?? user.avatarUrl} className="mx-auto size-24 text-[3.4rem]" />
          <h2 className="mt-4 font-heading text-[1.35rem] leading-tight">{member.name}</h2>
          <div className="mt-3 flex justify-center">
            <StatusPill status={member.status} />
          </div>
          <dl className="mt-6 grid gap-2.5 text-left text-[0.92rem]">
            {member.memberNo && <Row label="Member no." value={member.memberNo} />}
            <Row label="IUB ID" value={member.iubId} />
            {intakeLabel(member.iubId) && <Row label="Intake" value={intakeLabel(member.iubId)!} />}
            <Row label="Semester" value={currentSemester(member.iubId, new Date(now)) || "—"} />
            <Row label="Department" value={member.department || "—"} />
          </dl>
          {member.status === "approved" && (
            <Link href="/account/card" className="btn-pill btn-primary mt-6 w-full">
              Member card
              <ArrowIcon />
            </Link>
          )}
        </div>

        <div className="glass-card p-6">
          <Eyebrow>Sign-in accounts</Eyebrow>
          <p className="mt-2 mb-4 text-[0.88rem] leading-relaxed text-muted">
            After graduation your IUB email stops working. Connect a personal Google account to keep signing in here.
          </p>
          <LinkGmail primaryEmail={user.email} googleEmails={user.googleEmails} live={live} />
        </div>

        <form action={signOut}>
          <input type="hidden" name="next" value="/" />
          <button type="submit" className="w-full rounded-full border border-glass-border py-2.5 text-[0.88rem] text-muted transition-colors hover:text-fg">
            Sign out
          </button>
        </form>
      </aside>

      <section aria-label="Your profile" className="grid gap-5">
        {params.joined && <Notice tone="green" title="Registration received">Thanks for joining! An executive will check your payment, and we’ll email you when you’re approved.</Notice>}
        {params.linked && <Notice tone="green" title="Account connected">You can now sign in with your personal Google account too.</Notice>}
        {params.signin === "failed" && <Notice tone="red" title="That didn’t work">Connecting the account didn’t complete. Please try again.</Notice>}
        {member.status === "pending" && !params.joined && (
          <Notice tone="amber" title="Waiting for approval">An executive is checking your payment. We’ll email you at {member.email}{member.secondaryEmail ? ` and ${member.secondaryEmail}` : ""} when you’re approved.</Notice>
        )}
        {member.status === "rejected" && (
          <Notice tone="red" title="Your registration needs attention">
            {member.reviewNote ?? "We couldn’t confirm your registration."} Fix the details below and save to send it for review again.
          </Notice>
        )}
        {member.status === "lapsed" && (
          <Notice tone="amber" title="Your membership has lapsed">
            {member.reviewNote ?? "Talk to a JUKTI executive to renew it."}
          </Notice>
        )}
        {missing.length > 0 && member.status !== "rejected" && (
          <Notice tone="amber" title="Complete your profile">Add {missing.join(" and ")} below.</Notice>
        )}

        <div className="glass-card p-6 sm:p-9">
          <ProfileForm member={member} live={live} codeRequired={codeRequired} />
        </div>

        {mode === "preview" && <PreviewTools current={member.status} />}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-glass-border/60 pb-2.5 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-fg tabular-nums">{value}</dd>
    </div>
  );
}

const noticeTones = {
  green: "border-emerald-400/30 bg-emerald-400/[0.07]",
  amber: "border-amber-300/30 bg-amber-300/[0.07]",
  red: "border-[#ff8f7a]/35 bg-[#ff8f7a]/[0.08]",
} as const;

function Notice({ tone, title, children }: { tone: keyof typeof noticeTones; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className={cn("rounded-[18px] border px-5 py-4", noticeTones[tone])}>
      <p className="font-medium text-fg">{title}</p>
      <p className="mt-1 text-[0.95rem] leading-relaxed text-body">{children}</p>
    </div>
  );
}

/** Development only: see the pages for each membership status. */
function PreviewTools({ current }: { current: Member["status"] }) {
  return (
    <div className="rounded-[18px] border border-dashed border-sky-400/40 p-5">
      <p className="text-[0.8rem] tracking-[0.12em] text-sky-200 uppercase">Preview mode · only in development</p>
      <p className="mt-1 text-[0.88rem] text-muted">Your registration is kept in a cookie. Switch its status to see each version of the pages.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {memberStatuses.map((status) => (
          <form key={status} action={setPreviewStatus}>
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              aria-pressed={status === current}
              className="h-9 rounded-full border border-glass-border px-4 text-[0.82rem] text-body capitalize aria-pressed:border-sky-300 aria-pressed:text-sky-100"
            >
              {status}
            </button>
          </form>
        ))}
        <form action={resetPreview}>
          <button type="submit" className="h-9 rounded-full px-4 text-[0.82rem] text-muted hover:text-fg">
            Start over
          </button>
        </form>
      </div>
    </div>
  );
}

function AccountSkeleton() {
  const block = "rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse";
  return (
    <div aria-hidden className="mx-auto grid max-w-[80rem] gap-8 px-5 pt-[clamp(3rem,5vw,5rem)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className={cn(block, "h-[26rem]")} />
      <div className={cn(block, "h-[40rem]")} />
    </div>
  );
}
