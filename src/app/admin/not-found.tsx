import Link from "next/link";

/** A section that doesn't exist, or that the signed-in admin's roles don't cover. */
export default function AdminNotFound() {
  return (
    <div className="grid min-h-[60svh] place-items-center text-center">
      <div>
        <p className="text-[0.8rem] tracking-[0.14em] text-flare uppercase">Not available</p>
        <h1 className="mt-3 text-[1.8rem] font-light text-fg">This section isn’t open to you</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
          It doesn’t exist, or your role doesn’t cover it. A Master Admin can change your roles in People &amp; roles.
        </p>
        <Link href="/admin" className="btn-pill btn-ghost mt-7 text-[0.8rem]">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
