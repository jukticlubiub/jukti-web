"use client";

import { useState } from "react";
import { GoogleIcon } from "@/components/ui/icons";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** What Supabase's linking errors mean for the member. */
function explain(message: string) {
  if (/manual linking/i.test(message)) return "Connecting accounts isn’t switched on yet. Ask the webmaster to enable it.";
  if (/already.*(linked|exists)|identity_already_exists/i.test(message))
    return "That Google account already has its own account on this site, so it can’t be connected. Use a different one, or ask the webmaster to merge them.";
  return "Couldn’t connect that account. Please try again.";
}

/**
 * Alumni lose their IUB email. Connecting a personal Google account lets them keep
 * signing in to the same account (and member card) with it.
 */
export function LinkGmail({ primaryEmail, googleEmails, live }: { primaryEmail: string; googleEmails: string[]; live: boolean }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const others = googleEmails.filter((e) => e.toLowerCase() !== primaryEmail.toLowerCase());

  const connect = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account?linked=1")}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e) {
      setProblem(explain(e instanceof Error ? e.message : ""));
      setBusy(false);
    }
  };

  const disconnect = async (email: string) => {
    setBusy(true);
    setProblem(null);
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      const identity = data.identities.find((i) => i.provider === "google" && (i.identity_data as { email?: string } | undefined)?.email === email);
      if (!identity) throw new Error("not found");
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
      if (unlinkError) throw unlinkError;
      window.location.reload();
    } catch {
      setProblem("Couldn’t disconnect that account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 text-[0.95rem]">
        <li className="flex items-center gap-3">
          <GoogleIcon />
          <span className="min-w-0 truncate text-fg">{primaryEmail}</span>
          <span className="ml-auto text-[0.8rem] text-muted">IUB</span>
        </li>
        {others.map((email) => (
          <li key={email} className="flex items-center gap-3">
            <GoogleIcon />
            <span className="min-w-0 truncate text-fg">{email}</span>
            <button type="button" disabled={busy} onClick={() => disconnect(email)} className="ml-auto text-[0.82rem] text-muted hover:text-[#ffb4a6] disabled:opacity-50">
              Disconnect
            </button>
          </li>
        ))}
      </ul>
      {others.length === 0 &&
        (live ? (
          <button type="button" onClick={connect} disabled={busy} className="btn-pill btn-ghost h-10 w-fit px-5 text-[0.78rem] disabled:opacity-60">
            {busy ? "Opening Google…" : "Connect a personal Google account"}
          </button>
        ) : (
          <p className="text-[0.85rem] text-muted">Preview mode: connecting accounts needs Supabase.</p>
        ))}
      {problem && (
        <p role="alert" className="text-[0.88rem] text-[#ff8f7a]">
          {problem}
        </p>
      )}
    </div>
  );
}
