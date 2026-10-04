import Image from "next/image";
import { cn } from "@/lib/cn";
import type { TeamMember } from "@/lib/data/team";
import { Silhouette } from "./Silhouette";

/**
 * Colors per kind of card. Executives are burnt orange (sampled from the design);
 * faculty advisors are white, so they stand apart at the head of the row.
 * Text on the hover gradient: black on lava 4.6:1; black on white 21:1, lava role on white 4.7:1.
 */
const palettes = {
  executive: {
    background: "bg-[radial-gradient(120%_85%_at_50%_35%,#a84013_45%,#772d0d_100%)]",
    glow: "bg-[radial-gradient(55%_50%_at_50%_45%,rgb(200_74_26/0.45),transparent_70%)]",
    fade: "bg-[linear-gradient(to_bottom,rgb(200_74_26/0.96)_0%,rgb(200_74_26/0.75)_20%,rgb(200_74_26/0)_46%)]",
    role: "font-light text-[#1a0803]",
    silhouette: "text-[#2b0e04]/60",
  },
  advisor: {
    background: "bg-[radial-gradient(120%_85%_at_50%_35%,#f6f3ef_45%,#cdc5bd_100%)]",
    glow: "bg-[radial-gradient(55%_50%_at_50%_45%,rgb(255_255_255/0.7),transparent_70%)]",
    fade: "bg-[linear-gradient(to_bottom,rgb(255_255_255/0.97)_0%,rgb(255_255_255/0.8)_20%,rgb(255_255_255/0)_46%)]",
    role: "font-normal text-lava",
    silhouette: "text-black/15",
  },
} as const;

// Shown on hover or keyboard focus; always shown on touch screens, which can't hover.
const revealOnHover =
  "translate-y-3 opacity-0 transition-[opacity,translate] duration-500 ease-reveal group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100";

type TeamMemberCardProps = {
  person: TeamMember;
  /** Copies used to loop the marquee: hidden from assistive tech and the tab order. */
  duplicate?: boolean;
};

/**
 * Portrait card from the Team Jukti design: a black-and-white photo over the card color.
 * Hovering (or focusing) brings back the photo's color and fades in the name and role.
 * The photo fills the card (uploads are cropped to its 416:657 shape in the admin panel).
 */
export function TeamMemberCard({ person, duplicate = false }: TeamMemberCardProps) {
  const palette = palettes[person.kind];

  const body = (
    <>
      <div aria-hidden className={cn("absolute inset-0", palette.background)} />
      <div aria-hidden className={cn("absolute inset-x-0 bottom-0 h-3/4", palette.glow)} />

      {person.photo ? (
        <Image
          src={person.photo}
          alt=""
          fill
          draggable={false}
          sizes="(max-width: 768px) 62vw, 23vw"
          className="object-cover object-bottom grayscale transition-[filter,scale] duration-700 ease-reveal group-hover:scale-[1.035] group-hover:grayscale-0 group-focus-visible:grayscale-0"
        />
      ) : (
        <Silhouette className={palette.silhouette} />
      )}

      <div
        aria-hidden
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 ease-ui group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100",
          palette.fade,
        )}
      />

      <div className="relative px-[6cqw] pt-[13cqw] text-center">
        <p
          className={cn(
            "font-heading text-[7.2cqw] leading-tight tracking-[-0.01em] text-black [-webkit-text-stroke:0.02em_currentColor]",
            revealOnHover,
          )}
        >
          {person.name}
        </p>
        <p className={cn("mt-[0.35em] text-[6.6cqw] leading-tight tracking-[-0.02em] delay-75", palette.role, revealOnHover)}>
          {person.role}
        </p>
      </div>

      {person.linkedin && (
        <span
          aria-hidden
          className="absolute right-[5cqw] bottom-[5cqw] grid size-[11cqw] place-items-center rounded-full border border-white/25 bg-black/35 text-[5cqw] font-semibold text-white opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          in
        </span>
      )}
    </>
  );

  const shell =
    "group relative block aspect-[416/657] w-[clamp(210px,22.33vw,460px)] shrink-0 select-none overflow-hidden @container";

  if (person.linkedin) {
    return (
      <a
        href={person.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        tabIndex={duplicate ? -1 : undefined}
        aria-label={`${person.name}, ${person.role}. LinkedIn profile`}
        className={shell}
      >
        {body}
      </a>
    );
  }

  return <div className={shell}>{body}</div>;
}
