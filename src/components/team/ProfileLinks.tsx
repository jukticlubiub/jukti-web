import {
  DribbbleIcon,
  FacebookIcon,
  GitHubIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  ScholarIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { describeLink, type LinkKind } from "@/lib/profile-links";

const icons: Record<LinkKind, React.ReactNode> = {
  linkedin: <LinkedInIcon />,
  github: <GitHubIcon />,
  behance: <span className="text-[0.8em] font-bold tracking-tight">Bē</span>,
  dribbble: <DribbbleIcon />,
  facebook: <FacebookIcon />,
  instagram: <InstagramIcon />,
  x: <XIcon />,
  youtube: <YouTubeIcon />,
  scholar: <ScholarIcon />,
  researchgate: <span className="text-[0.72em] font-bold">RG</span>,
  website: <GlobeIcon />,
};

const button =
  "grid size-9 place-items-center rounded-full border border-glass-border bg-white/[0.04] text-[1.05rem] text-body transition-[background-color,border-color,color] duration-200 hover:border-flare/60 hover:bg-lava/20 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flare";

/** An alumnus's or advisor's email and profile links, as a row of small round icon buttons. */
export function ProfileLinks({ name, email, links = [], className }: { name: string; email?: string; links?: string[]; className?: string }) {
  if (!email && links.length === 0) return null;
  return (
    <ul aria-label={`Contact ${name}`} className={cn("flex flex-wrap gap-2", className)}>
      {email && (
        <li>
          <a href={`mailto:${email}`} title={email} aria-label={`Email ${name} (${email})`} className={button}>
            <MailIcon />
          </a>
        </li>
      )}
      {links.map((href) => {
        const { kind, label } = describeLink(href);
        return (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={`${name} on ${label}`} className={button}>
              {icons[kind]}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
