"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/members/AccountHeader";
import { accountTabs } from "@/components/members/AccountHeader";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { supabaseEnv } from "@/lib/supabase/config";

type SessionUser = { name: string; avatarUrl: string | null };

/**
 * Who's signed in, read in the browser from the session cookie (no request), so the
 * header stays cached for everyone. Null while unknown or signed out. The Supabase client
 * is loaded only here, after the page is up, so it isn't part of every page's first download.
 */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    if (!supabaseEnv) return;
    let stop = false;
    let unsubscribe = () => {};
    const read = (u: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      if (stop) return;
      if (!u) return setUser(null);
      const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
      setUser({ name: meta.full_name || meta.name || (u.email ?? "").split("@")[0], avatarUrl: meta.avatar_url || meta.picture || null });
    };
    void import("@/lib/supabase/browser").then(({ createBrowserSupabase }) => {
      if (stop) return;
      const supabase = createBrowserSupabase();
      supabase.auth.getSession().then(({ data }) => read(data.session?.user));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => read(session?.user));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      stop = true;
      unsubscribe();
    };
  }, []);
  return user;
}

/** Header: the account menu when signed in, otherwise "Sign in" (which leads to /join). */
export function AccountButton({ className }: { className?: string }) {
  const user = useSessionUser();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/join"
        className={cn(
          "inline-flex items-center rounded-full border border-glass-border px-4 py-2 text-[0.88rem] text-fg transition-colors hover:border-flare/60 hover:text-flare",
          // On phones it sits next to the menu button: same height, and readable over the hero.
          "max-lg:glass max-lg:h-11 max-lg:py-0",
          className,
        )}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Your account (${user.name})`}
        className="grid size-11 place-items-center rounded-full ring-1 ring-glass-border transition-shadow hover:ring-flare/60"
      >
        <Avatar name={user.name} url={user.avatarUrl} className="size-9 text-[1.3rem]" />
      </button>
      {open && (
        <div role="menu" className="absolute top-[calc(100%+0.6rem)] right-0 z-10 w-56 rounded-[18px] border border-glass-border bg-[#0e0907]/95 p-2 shadow-2xl backdrop-blur-xl">
          <p className="truncate px-3 pt-2 pb-2.5 text-[0.85rem] text-muted">{user.name}</p>
          {accountTabs.map((tab) => (
            <Link key={tab.href} role="menuitem" href={tab.href} onClick={() => setOpen(false)} className="block rounded-[10px] px-3 py-2 text-[0.92rem] text-body hover:bg-white/[0.06] hover:text-fg">
              {tab.label === "Directory" ? "Members directory" : tab.label}
            </Link>
          ))}
          <form action={signOut} className="mt-1 border-t border-glass-border pt-1">
            <input type="hidden" name="next" value="/" />
            <button type="submit" role="menuitem" className="w-full rounded-[10px] px-3 py-2 text-left text-[0.92rem] text-muted hover:bg-white/[0.06] hover:text-fg">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
