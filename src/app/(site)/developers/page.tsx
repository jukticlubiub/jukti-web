import type { Metadata } from "next";
import Image from "next/image";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { FacebookIcon, InstagramIcon, LinkedInIcon, MailIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { getDevelopers } from "@/lib/content/queries";
import { type Developer, siteCreated, stack } from "@/lib/data/developers";

export const metadata: Metadata = {
  title: "Developers",
  description: "The JUKTI members who designed and built this website.",
};

const created = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(
  new Date(`${siteCreated}T12:00:00+06:00`),
);

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={`size-[1.1em] shrink-0 ${className ?? ""}`}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden className={`size-[1.1em] shrink-0 ${className ?? ""}`}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

function socialsOf(d: Developer) {
  const s = d.socials;
  return [
    { label: "LinkedIn", href: s.linkedin, Icon: LinkedInIcon },
    { label: "GitHub", href: s.github, Icon: GitHubIcon },
    { label: "Facebook", href: s.facebook, Icon: FacebookIcon },
    { label: "Instagram", href: s.instagram, Icon: InstagramIcon },
    { label: "Website", href: s.website, Icon: GlobeIcon },
    { label: "Email", href: s.email ? `mailto:${s.email}` : undefined, Icon: MailIcon },
  ].filter((x): x is typeof x & { href: string } => Boolean(x.href));
}

export default async function DevelopersPage() {
  const developers = await getDevelopers();
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      <section aria-labelledby="dev-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
        <p className="text-[0.95rem] text-flare">Built by members, for members</p>
        <h1 id="dev-title" className="mt-4 font-heading text-[clamp(2.1rem,5.87vw,7.4rem)]">
          <MaskReveal>
            THE <span className="text-flare">DEVELOPERS</span>
          </MaskReveal>
        </h1>
        <Reveal as="p" delay={0.15} className="mx-auto mt-6 max-w-2xl text-[clamp(1.05rem,1.4vw,1.3rem)] leading-relaxed text-body/85">
          The JUKTI members who designed, built and run this website. Live since{" "}
          <time dateTime={siteCreated} className="text-fg">
            {created}
          </time>
          .
        </Reveal>
      </section>

      <ul className="relative mx-auto mt-[clamp(3.5rem,6vw,6rem)] grid max-w-[84rem] gap-6 px-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-[clamp(2rem,4vw,5rem)]">
        {developers.map((d, i) => {
          const links = socialsOf(d);
          return (
            <Reveal as="li" key={d.id} delay={i * 0.08}>
              <article className="group glass-card relative overflow-hidden p-2">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[14px]">
                  <Image
                    src={d.photo}
                    alt={`Portrait of ${d.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
                    className="object-cover object-top grayscale transition-[filter,scale] duration-1000 ease-reveal group-hover:scale-[1.04] group-hover:grayscale-0 [@media(hover:none)]:grayscale-0"
                  />
                  <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(to_top,rgb(0_0_0/0.92),rgb(0_0_0/0.55)_45%,transparent)]" />
                  <span className="absolute top-4 left-4 rounded-full border border-white/15 bg-black/55 px-3.5 py-1.5 text-[0.75rem] font-medium tracking-[0.12em] text-fg uppercase backdrop-blur-md">
                    {d.role}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h2 className="text-[clamp(1.5rem,2.2vw,2rem)] leading-tight font-light tracking-[-0.02em] text-fg">{d.name}</h2>
                    <p className="mt-1 text-[0.95rem] text-flare">{d.designation}</p>
                    {links.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {links.map(({ label, href, Icon }) => (
                          <li key={label}>
                            <a
                              href={href}
                              target={href.startsWith("mailto:") ? undefined : "_blank"}
                              rel="noreferrer"
                              aria-label={`${d.name} on ${label}`}
                              className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/40 text-fg backdrop-blur-md transition-[background-color,border-color,color] duration-300 hover:border-flare hover:bg-lava"
                            >
                              <Icon />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ul>

      <section aria-labelledby="stack-title" className="relative mx-auto mt-[clamp(5rem,9vw,9rem)] max-w-3xl px-5 text-center">
        <h2 id="stack-title" className="text-[0.78rem] font-medium tracking-[0.18em] text-muted uppercase">
          Built with
        </h2>
        <Reveal className="mt-5 flex flex-wrap justify-center gap-2">
          {stack.map((t) => (
            <span key={t} className="rounded-full border border-glass-border bg-glass px-4 py-2 text-[0.9rem] text-body">
              {t}
            </span>
          ))}
        </Reveal>
      </section>
    </div>
  );
}
