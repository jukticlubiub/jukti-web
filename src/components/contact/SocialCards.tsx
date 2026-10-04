import { GlassCard } from "@/components/glass/GlassCard";
import { ArrowIcon, FacebookIcon, InstagramIcon, LinkedInIcon, MailIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import { getSocials } from "@/lib/content/queries";
import { CopyEmail } from "./CopyEmail";

const channelsFor = ({ facebook, instagram, linkedin }: { facebook: string; instagram: string; linkedin: string }) => [
  {
    platform: "Facebook",
    handle: "/jukti.cse.iub",
    blurb: "Event announcements, photos and club news, as they happen.",
    cta: "Follow on Facebook",
    href: facebook,
    Icon: FacebookIcon,
  },
  {
    platform: "Instagram",
    handle: "@jukti.iub",
    blurb: "Posters, reels and behind the scenes from every event.",
    cta: "Follow on Instagram",
    href: instagram,
    Icon: InstagramIcon,
  },
  {
    platform: "LinkedIn",
    handle: "JUKTI (IUB)",
    blurb: "Workshops, achievements and opportunities for members.",
    cta: "Follow on LinkedIn",
    href: linkedin,
    Icon: LinkedInIcon,
  },
] as const;

const iconBadge =
  "grid size-14 place-items-center rounded-2xl border border-glass-border bg-white/[0.04] text-fg transition-[background-color,border-color,box-shadow] duration-300 ease-ui group-hover:border-flare group-hover:bg-lava group-hover:shadow-[0_0_34px_-2px_rgb(245_124_72/0.65)] [&>svg]:size-6";

/** The club's channels as glass cards: Facebook, Instagram, LinkedIn, and email. */
export async function SocialCards() {
  const socials = await getSocials();
  const { email } = socials;
  const channels = channelsFor(socials);
  return (
    <ul className="grid gap-[clamp(1rem,1.6vw,1.75rem)] sm:grid-cols-2 xl:grid-cols-4">
      {channels.map(({ platform, handle, blurb, cta, href, Icon }, i) => (
        <Reveal as="li" key={platform} delay={i * 0.06}>
          <GlassCard className="group h-full">
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col rounded-[inherit] p-6 sm:p-7">
              <span className={iconBadge}>
                <Icon />
              </span>
              <p className="mt-8 text-[0.78rem] font-medium tracking-[0.16em] text-muted uppercase">{platform}</p>
              <p className="mt-2 font-heading text-[clamp(1.1rem,1.35vw,1.35rem)] leading-tight transition-colors duration-300 group-hover:text-flare">
                {handle}
              </p>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-body/85">{blurb}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[0.9rem] font-medium text-fg">
                {cta}
                <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </GlassCard>
        </Reveal>
      ))}

      <Reveal as="li" delay={channels.length * 0.06}>
        <GlassCard className="group h-full">
          <div className="relative flex h-full flex-col p-6 sm:p-7">
            <span className={iconBadge}>
              <MailIcon />
            </span>
            <p className="mt-8 text-[0.78rem] font-medium tracking-[0.16em] text-muted uppercase">Email</p>
            {/* The address is the card's main link; it covers the card, and Copy sits above it. */}
            <a
              href={`mailto:${email}`}
              className="mt-2 font-heading text-[clamp(0.95rem,1.1vw,1.1rem)] leading-tight [overflow-wrap:anywhere] transition-colors duration-300 group-hover:text-flare after:absolute after:inset-0 after:rounded-[inherit]"
            >
              {email}
            </a>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-body/85">Partnerships, sponsorships and anything else. We read everything.</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-8">
              <span className="inline-flex items-center gap-2 text-[0.9rem] font-medium text-fg">
                Write to us
                <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <CopyEmail email={email} className="relative z-10 min-h-9 px-3.5 py-2" />
            </div>
          </div>
        </GlassCard>
      </Reveal>
    </ul>
  );
}
