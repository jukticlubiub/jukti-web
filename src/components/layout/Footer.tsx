import Link from "next/link";
import { CseLogo, IubLogo } from "@/components/brand/AffiliationLogos";
import { Logo } from "@/components/brand/Logo";
import { getSocials } from "@/lib/content/queries";
import { joinLink, navLinks, site } from "@/lib/site";

export async function Footer() {
  const socials = await getSocials();
  const socialLinks = [
    { label: "Facebook", href: socials.facebook },
    { label: "Instagram", href: socials.instagram },
    { label: "LinkedIn", href: socials.linkedin },
    { label: "Email", href: socials.email && `mailto:${socials.email}` },
  ].filter((s) => s.href);

  return (
    <footer className="relative mt-auto overflow-hidden bg-void px-[clamp(1.25rem,4vw,4rem)] pt-20 pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-48 mx-auto h-96 max-w-5xl rounded-full bg-ember-2/65 blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-6">
          <Link href="/" aria-label="JUKTI home" className="inline-block w-fit transition-opacity hover:opacity-80">
            <Logo className="w-44 text-fg" />
          </Link>
          <p className="max-w-sm text-muted">{site.tagline}, Independent University, Bangladesh. Welcome to the JUKTIverse.</p>
          <Link href={joinLink.href} className="btn-pill btn-primary text-sm">
            {joinLink.label}
          </Link>
        </div>

        <nav aria-label="Footer">
          <p className="mb-4 font-heading text-sm tracking-normal">Explore</p>
          <ul className="space-y-2.5">
            {[...navLinks, { label: "Contact", href: "/contact" }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body transition-colors hover:text-flare">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-4 font-heading text-sm tracking-normal">Connect</p>
          {socialLinks.length > 0 ? (
            <ul className="space-y-2.5">
              {socialLinks.map((s) => (
                <li key={s.label}>
                  <a href={s.href} className="text-body transition-colors hover:text-flare" target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Social links coming soon.</p>
          )}
          <div className="mt-10 flex items-center gap-5">
            <a href="https://iub.ac.bd/academics/departments" target="_blank" rel="noreferrer" aria-label="Departments at IUB" className="transition-opacity hover:opacity-80">
              <CseLogo className="w-12" />
            </a>
            <span aria-hidden className="h-11 w-px bg-fg/25" />
            <a href="https://iub.ac.bd" target="_blank" rel="noreferrer" aria-label="Independent University, Bangladesh" className="transition-opacity hover:opacity-80">
              <IubLogo className="w-[4.5rem]" />
            </a>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted">
            Department of Computer Science and Engineering, Independent University, Bangladesh
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-16 flex max-w-7xl items-center gap-6 text-sm text-body">
        <span aria-hidden className="h-px flex-1 bg-fg/40" />
        <span>JUKTI · Club of CSE, IUB</span>
        <span aria-hidden className="text-fg/40">·</span>
        <Link href="/developers" className="transition-colors hover:text-flare">
          Developers
        </Link>
      </div>
    </footer>
  );
}
