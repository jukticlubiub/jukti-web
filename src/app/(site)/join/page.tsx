import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AccountHeader, Eyebrow } from "@/components/members/AccountHeader";
import { JoinForm } from "@/components/members/JoinForm";
import { JuroGreeter } from "@/components/juro/JuroGreeter";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { ArrowIcon, CalendarIcon, FacebookIcon, IdCardIcon, UserIcon, UsersIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import { signOut } from "@/lib/auth/actions";
import { getRegistrationOpen, getSocials } from "@/lib/content/queries";
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
  const [{ mode, user, member }, params, now, open] = await Promise.all([getAccount(), searchParams, requestTime(), getRegistrationOpen()]);
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

  if (!open) return <NotRecruiting user={user} signInFailed={params.signin === "failed"} />;

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

/** What a member finds after signing in, listed on the closed page's sign-in side. */
const memberPerks = [
  { Icon: UserIcon, title: "Profile", text: "Update your details and photo" },
  { Icon: IdCardIcon, title: "Member card", text: "Your digital card with its QR code" },
  { Icon: CalendarIcon, title: "Activity", text: "Events you attended, and certificates" },
  { Icon: UsersIcon, title: "Directory", text: "Find and connect with other members" },
] as const;

/**
 * Registration closed in Admin > Members. One card, two sides: Juro and the news that we're
 * not recruiting (with the Facebook page for the next round), and signing in for members.
 */
async function NotRecruiting({ user, signInFailed }: { user: { email: string } | null; signInFailed: boolean }) {
  const { facebook } = await getSocials();
  return (
    <Reveal className="glass-card grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Not recruiting */}
      <section aria-labelledby="closed-title" className="flex flex-col items-center px-6 pt-8 pb-10 text-center sm:px-10">
        <div className="relative mt-6 w-fit">
          {/* A warm glow for him to stand in. */}
          <div aria-hidden className="absolute inset-x-[-30%] bottom-[2%] h-[45%] rounded-[100%] bg-[radial-gradient(closest-side,rgb(245_124_72/0.35),transparent)]" />
          <JuroGreeter message="See you next recruitment!" clickMessage="Follow us on Facebook!" />
        </div>
        <Eyebrow className="mt-4">Recruitment closed</Eyebrow>
        <h2 id="closed-title" className="mt-3 font-heading text-[clamp(1.3rem,1.9vw,1.6rem)] leading-tight">
          We’re not recruiting members this semester
        </h2>
        <p className="mt-4 max-w-[24rem] leading-relaxed text-body/85">Keep an eye on our Facebook page for our next recruitment.</p>
        <a href={facebook} target="_blank" rel="noopener noreferrer" className="btn-pill btn-primary mt-7">
          <FacebookIcon />
          <span>
            <span className="max-sm:hidden">Follow </span>JUKTI on Facebook
          </span>
          <ArrowIcon />
        </a>
      </section>

      {/* Members */}
      <section
        aria-labelledby="members-title"
        className="flex flex-col justify-center rounded-b-[inherit] border-t border-glass-border bg-[linear-gradient(160deg,rgb(255_255_255/0.04),transparent_55%)] px-6 py-10 sm:px-10 md:rounded-l-none md:rounded-r-[inherit] md:border-t-0 md:border-l"
      >
        <Eyebrow>Already a member?</Eyebrow>
        <h2 id="members-title" className="mt-3 font-heading text-[clamp(1.3rem,2.1vw,1.75rem)] leading-tight">
          {user ? "No membership on this account" : "Sign in to your account"}
        </h2>
        <p className="mt-3 leading-relaxed text-body/85">
          {user ? (
            <>
              You’re signed in as <span className="break-all text-fg">{user.email}</span>. Members sign in with their IUB email, or the
              personal Gmail they linked.
            </>
          ) : (
            "Recruitment being closed doesn’t affect members. Sign in to keep your profile up to date and use your member card."
          )}
        </p>

        <ul className="mt-7 grid gap-4">
          {memberPerks.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-flare/35 bg-lava/10 text-[1.15rem] text-flare">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-fg">{title}</span>
                <span className="block text-[0.9rem] leading-snug text-body/75">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        {user ? (
          <form action={signOut} className="mt-8">
            <input type="hidden" name="next" value="/join" />
            <button type="submit" className="btn-pill btn-ghost w-full">
              Sign out and switch account
            </button>
          </form>
        ) : (
          <>
            <GoogleSignIn next="/join" label="Sign in with Google" className="mt-8" />
            <p className="mt-3 text-center text-[0.82rem] leading-relaxed text-muted">Use your IUB email, or the personal Gmail you linked to your account.</p>
          </>
        )}
        {signInFailed && (
          <p role="alert" className="mt-3 text-[0.92rem] text-[#ff8f7a]">
            Sign-in didn’t complete. Please try again.
          </p>
        )}
      </section>
    </Reveal>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <Reveal className="glass-card p-6 sm:p-9">{children}</Reveal>;
}
