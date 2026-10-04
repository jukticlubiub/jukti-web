import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LogoMark } from "@/components/brand/Logo";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { getAdmin } from "@/lib/admin/access";
import { navFor } from "@/lib/admin/roles";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · JUKTI Admin" },
  robots: { index: false, follow: false },
};

// The panel is behind sign-in, and signed out its pages aren't rendered at all, so it's allowed
// to block on the server rather than validated for instant navigation.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-svh bg-[#0b0a09] text-body">
      <Suspense fallback={<Loading />}>
        <Gate>{children}</Gate>
      </Suspense>
    </div>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();

  if (admin.status === "unavailable") {
    return (
      <Notice title="The admin panel isn’t set up yet">
        It needs the club’s Supabase project. Set the Supabase environment variables (see <code>.env.example</code>) and apply
        the migrations in <code>supabase/migrations</code>.
      </Notice>
    );
  }

  if (admin.status === "signed-out") {
    return (
      <Notice title="JUKTI Admin">
        <p>Sign in with the Google account the club gave admin access to.</p>
        <GoogleSignIn next="/admin" className="mx-auto mt-6 max-w-xs" />
      </Notice>
    );
  }

  if (admin.status === "no-access") {
    return (
      <Notice title="No admin access">
        <p>
          You’re signed in as <span className="text-fg">{admin.email}</span>, which hasn’t been given a role. Ask a Master Admin to add
          this email in People &amp; roles, then sign in again.
        </p>
        <form action={signOut} className="mt-6">
          <input type="hidden" name="next" value="/admin" />
          <button type="submit" className="btn-pill btn-ghost text-[0.8rem]">
            Use another account
          </button>
        </form>
      </Notice>
    );
  }

  return (
    <AdminShell admin={{ name: admin.name, email: admin.email, roles: admin.roles, mode: admin.mode }} nav={navFor(admin.roles)}>
      {children}
    </AdminShell>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center px-5">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <LogoMark className="mx-auto w-10 text-flare" title="" />
        <h1 className="mt-5 text-[1.6rem] font-light text-fg">{title}</h1>
        <div className="mt-3 leading-relaxed text-body/85 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:text-[0.88em]">{children}</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid min-h-svh place-items-center">
      <LogoMark className="w-10 animate-pulse text-flare/60" title="Loading" />
    </div>
  );
}
