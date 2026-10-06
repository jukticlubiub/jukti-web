"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { setPreviewRoles } from "@/lib/admin/actions/preview";
import { type AdminRole, adminRoles, type NavGroup, roleInfo } from "@/lib/admin/roles";

type ShellAdmin = { name: string; email: string; roles: AdminRole[]; mode: "live" | "preview" };

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The admin panel's frame: sidebar (a drawer on phones), top bar and content. */
export function AdminShell({ admin, nav, children }: { admin: ShellAdmin; nav: NavGroup[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer after navigating.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  // The most specific matching link is the current one (Executive codes, not Members, on its page).
  const currentHref = nav
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((href) => isCurrent(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-2 py-1">
        <LogoMark className="w-7 text-flare" title="" />
        <span className="leading-tight">
          <span className="block text-[0.95rem] font-medium text-fg">JUKTI Admin</span>
          <span className="block text-[0.75rem] text-muted">Club of CSE, IUB</span>
        </span>
      </Link>
      <div className="mt-8 flex-1 space-y-6 overflow-y-auto pr-1">
        {nav.map((group) => (
          <div key={group.title}>
            <p className="px-3 text-[0.7rem] font-medium tracking-[0.14em] text-muted/80 uppercase">{group.title}</p>
            <ul className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const current = item.href === currentHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-center rounded-[10px] px-3 py-2 text-[0.92rem] transition-colors",
                        current ? "bg-lava/20 text-fg shadow-[inset_2px_0_0_var(--color-flare)]" : "text-body/80 hover:bg-white/[0.04] hover:text-fg",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-glass-border pt-4">
        <Link href="/" className="block rounded-[10px] px-3 py-2 text-[0.88rem] text-muted transition-colors hover:text-fg">
          ← Back to the website
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-svh">
      {/* Sidebar on desktop */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-glass-border bg-[#0d0b0a] px-4 py-6 lg:block">{sidebar}</aside>

      {/* Drawer on phones and tablets */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-glass-border bg-[#0d0b0a] px-4 py-6">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-glass-border bg-[#0b0a09]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-full border border-glass-border text-fg lg:hidden"
          >
            <span aria-hidden className="flex w-4 flex-col gap-1">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
              <span className="h-px w-2/3 bg-current" />
            </span>
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {admin.roles.map((r) => (
              <span key={r} className="rounded-full border border-flare/35 bg-lava/10 px-2.5 py-1 text-[0.72rem] text-flare">
                {roleInfo[r].label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[0.9rem] text-fg">{admin.name}</p>
              <p className="text-[0.78rem] text-muted">{admin.email}</p>
            </div>
            {admin.mode === "live" && (
              <form action={signOut}>
                <input type="hidden" name="next" value="/admin" />
                <button type="submit" className="btn-pill btn-ghost h-9 px-4 text-[0.75rem]">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </header>

        {admin.mode === "preview" && <PreviewBar roles={admin.roles} />}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

/** Development without Supabase: pick which roles to try the panel as. */
function PreviewBar({ roles }: { roles: AdminRole[] }) {
  return (
    <form action={setPreviewRoles} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sky-400/20 bg-sky-400/[0.06] px-4 py-2.5 text-[0.82rem] sm:px-6">
      <span className="text-sky-200">Preview mode (no Supabase): sample data, nothing is saved. Try the panel as:</span>
      {adminRoles.map((r) => (
        <label key={r} className="inline-flex cursor-pointer items-center gap-1.5 text-body">
          <input type="checkbox" name="role" value={r} defaultChecked={roles.includes(r)} className="accent-[#f57c48]" />
          {roleInfo[r].label}
        </label>
      ))}
      <button type="submit" className="rounded-full border border-sky-300/40 px-3 py-1 text-sky-100 hover:bg-sky-400/10">
        Apply
      </button>
    </form>
  );
}
