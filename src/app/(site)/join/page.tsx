import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, Eyebrow } from "@/components/members/AccountHeader";
import { JoinForm } from "@/components/members/JoinForm";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { Reveal } from "@/components/ui/Reveal";
import { signOut } from "@/lib/auth/actions";
import { getAccount } from "@/lib/members/account";
import { requestTime } from "@/lib/events/now";
import { currentSemester, intakeLabel } from "@/lib/members/semester";

export const metadata: Metadata = {
  title: "Join JUKTI",
  description: "Become a member of JUKTI, the Club of CSE at IUB: sign in with your IUB Google account and register.",
};

const steps = [
  ["Sign in", "With your IUB Google account (your student ID @iub.edu.bd)."],
  ["Register", "Fill in your details and pay the fee by bKash or to an executive."],
  ["Get approved", "An executive checks your payment. Then your member card is ready."],
] as const;

export default function JoinPage({ searchParams }: PageProps<"/join">) {
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <AccountHeader title="JOIN" accent="JUKTI" subtitle="Skill. Network. Knowledge." tabs={false} />
      <div className="relative mx-auto max-w-[56rem] px-5 pt-[clamp(3rem,5vw,5rem)]">
        <Suspense fallback={<div aria-hidden className="h-[28rem] rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse" />}>
          <JoinBody searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function JoinBody({ searchParams }: Pick<PageProps<"/join">, "searchParams">) {
  const [{ mode, user, member }, params, now] = await Promise.all([getAccount(), searchParams, requestTime()]);
  // Already registered (including through the old registration app): straight to the account.
  if (member) redirect("/account");

  if (mode === "off") {
    return (
      <Card>
        <Eyebrow>Opening soon</Eyebrow>
        <h2 className="mt-3 font-heading text-[clamp(1.4rem,2.4vw,2rem)]">Online registration isn’t open yet</h2>
        <p className="mt-3 text-body/85">Talk to any JUKTI executive to join in the meantime.</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <Eyebrow>Become a member</Eyebrow>
          <h2 className="mt-3 font-heading text-[clamp(1.4rem,2.4vw,2rem)] leading-tight">Sign in with your IUB account</h2>
          <p className="mt-3 leading-relaxed text-body/85">
            Already registered? Sign in the same way and you’ll go straight to your profile and member card.
          </p>
          <GoogleSignIn next="/join" iub label="Continue with IUB Google" className="mt-7" />
          {params.signin === "failed" && (
            <p role="alert" className="mt-3 text-[0.92rem] text-[#ff8f7a]">
              Sign-in didn’t complete. Please try again.
            </p>
          )}
        </Card>
        <Reveal delay={0.1} className="glass-card p-6 sm:p-8">
          <Eyebrow>How it works</Eyebrow>
          <ol className="mt-5 grid gap-5">
            {steps.map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-flare/45 font-display text-[0.8rem] text-flare">{i + 1}</span>
                <div>
                  <p className="font-medium text-fg">{title}</p>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-body/85">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    );
  }

  if (!user.iubId) {
    return (
      <Card>
        <Eyebrow>Wrong account</Eyebrow>
        <h2 className="mt-3 font-heading text-[clamp(1.4rem,2.4vw,2rem)] leading-tight">Registration needs your IUB student account</h2>
        <p className="mt-3 leading-relaxed text-body/85">
          You’re signed in as <span className="text-fg">{user.email}</span>, which isn’t connected to a membership. Sign out, then sign in
          with your student email (your 7-digit ID @iub.edu.bd).
        </p>
        <form action={signOut} className="mt-7">
          <input type="hidden" name="next" value="/join" />
          <button type="submit" className="btn-pill btn-primary">
            Sign out and switch account
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Registration</Eyebrow>
      <h2 className="mt-3 font-heading text-[clamp(1.4rem,2.4vw,2rem)] leading-tight">Welcome, {user.name.split(" ")[0]}</h2>
      <p className="mt-2 mb-9 text-body/85">A few details and you’re in. Signed in as {user.email}.</p>
      <JoinForm
        userId={user.id}
        googleName={user.name}
        email={user.email}
        iubId={user.iubId}
        semester={currentSemester(user.iubId, new Date(now))}
        intake={intakeLabel(user.iubId)}
        live={mode === "live"}
      />
      {mode === "preview" && (
        <p className="mt-8 text-[0.8rem] leading-relaxed text-muted">
          Preview mode: Supabase isn’t connected, so you’re signed in as a pretend IUB student and your registration is kept in a cookie
          in this browser. Only shown in development.
        </p>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <Reveal className="glass-card p-6 sm:p-9">{children}</Reveal>;
}
