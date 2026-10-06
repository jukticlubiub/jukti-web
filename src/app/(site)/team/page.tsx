import type { Metadata } from "next";
import { AlumniNetwork } from "@/components/team/AlumniNetwork";
import { FormerAdvisors } from "@/components/team/FormerAdvisors";
import { MembersList } from "@/components/team/MembersList";
import { TeamBackdrop } from "@/components/team/TeamBackdrop";
import { TeamCarousel } from "@/components/team/TeamCarousel";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { getAlumni, getTeam } from "@/lib/content/queries";
import { getPublicMembers } from "@/lib/members/public";

export const metadata: Metadata = {
  title: "Team Jukti",
  description: "Meet the minds behind JUKTI: the faculty advisors, executive panel, members, former advisors and alumni of the Club of CSE, IUB.",
};

export default async function TeamPage() {
  const [{ members, boardTerm }, alumni, clubMembers] = await Promise.all([getTeam(), getAlumni(), getPublicMembers()]);
  return (
    <>
      {/* Clip sideways only: the lava glow behind the portraits may spill down into the alumni section. */}
      <section aria-labelledby="team-title" className="relative overflow-x-clip">
        <TeamBackdrop />

        <div className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
          <h1 id="team-title" className="font-heading text-[clamp(2.1rem,5.87vw,7.4rem)]">
            <MaskReveal>
              TEAM <span className="text-flare">JUKTI</span>
            </MaskReveal>
          </h1>
          <Reveal
            as="p"
            delay={0.15}
            className="mt-[0.35em] text-[clamp(1.1rem,2.6vw,3rem)] leading-tight font-light tracking-[-0.03em] text-fg"
          >
            Meet the Minds Behind JUKTI
          </Reveal>
          <Reveal
            as="h2"
            delay={0.2}
            className="mt-[clamp(2.5rem,4.9vw,6rem)] font-heading text-[clamp(1.1rem,2.14vw,2.6rem)]"
          >
            Executive Board {boardTerm}
          </Reveal>
        </div>

        <Reveal delay={0.25} className="relative mt-[clamp(1.5rem,2vw,2.75rem)]">
          <TeamCarousel people={members} />
        </Reveal>
      </section>

      <MembersList members={clubMembers} />
      <FormerAdvisors advisors={alumni.filter((a) => a.kind === "former_advisor")} />
      <AlumniNetwork alumni={alumni.filter((a) => a.kind !== "former_advisor")} />
    </>
  );
}
