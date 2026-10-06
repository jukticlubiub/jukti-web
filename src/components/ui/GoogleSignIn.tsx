import { signInWithGoogle } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { GoogleIcon } from "./icons";

/** "Continue with Google": signs in, then comes back to `next` (a path on this site). `iub` offers IUB accounts first. */
export function GoogleSignIn({ next, className, iub = false, label = "Continue with Google" }: { next: string; className?: string; iub?: boolean; label?: string }) {
  return (
    <form action={signInWithGoogle} className={className}>
      <input type="hidden" name="next" value={next} />
      {iub && <input type="hidden" name="hd" value="iub.edu.bd" />}
      <button
        type="submit"
        className={cn(
          "btn-pill w-full bg-white text-[0.95rem] tracking-normal text-[#1f1f1f] normal-case hover:bg-[#f2f2f2] hover:shadow-[0_10px_36px_-12px_rgb(245_124_72/0.6)]",
        )}
      >
        <GoogleIcon />
        {label}
      </button>
    </form>
  );
}
