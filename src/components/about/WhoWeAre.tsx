import { GlassCard } from "@/components/glass/GlassCard";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";

/*
 * Who JUKTI is and what it does, in the club's own terms (from its page on iub.ac.bd):
 * the three guiding principles, and the four kinds of activity.
 */

const principles = [
  { title: "Skill", text: "Technical and professional skills, built through hands-on work, for beginners and experienced students alike." },
  { title: "Networking", text: "Meaningful connections between students, alumni and industry professionals." },
  { title: "Knowledge", text: "A culture of continuous learning, where students learn from each other." },
];

const activities = [
  { title: "Workshops & training", text: "Regular sessions that build technical and professional skills, from first steps to advanced topics." },
  { title: "Events & competitions", text: "Academic and creative events that reward innovation, teamwork and problem-solving." },
  { title: "Community service", text: "Social initiatives and volunteering that give back to the community." },
  { title: "Sports & recreation", text: "Games and get-togethers that build friendships and a healthy student life." },
];

export function WhoWeAre() {
  return (
    <section aria-labelledby="who-title" className="relative z-10 mx-auto max-w-[84rem] px-5 pt-[clamp(4rem,10vh,8rem)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-[clamp(3rem,6vw,7rem)]">
        <div>
          <p className="flex items-center gap-2 text-[0.95rem] text-flare">
            Who we are <span aria-hidden className="inline-block -rotate-45">→</span>
          </p>
          <h2 id="who-title" className="mt-4 text-[clamp(2.2rem,4.4vw,4.2rem)] leading-[1.02] font-extralight tracking-[-0.04em] text-fg">
            <MaskReveal>Skill. Networking.</MaskReveal>
            <MaskReveal className="text-flare">Knowledge.</MaskReveal>
          </h2>
          <Reveal as="p" delay={0.1} className="mt-6 max-w-xl text-[clamp(1.02rem,1.2vw,1.18rem)] leading-relaxed text-body/85">
            JUKTI is the club of the Department of Computer Science and Engineering at IUB: a place to explore technology,
            sharpen problem-solving, and gain practical experience beyond the classroom. It welcomes every CSE student, whether
            you’re writing your first program or already shipping projects.
          </Reveal>
          <Reveal as="p" delay={0.15} className="mt-5 max-w-xl text-[clamp(1.02rem,1.2vw,1.18rem)] leading-relaxed text-body/85">
            Our alumni work in software engineering, data science, research, entrepreneurship and higher education, in
            Bangladesh and abroad, and many come back for seminars, guest sessions and mentoring.
          </Reveal>
        </div>

        <ol className="grid gap-4 sm:grid-cols-3 lg:self-end">
          {principles.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.08}>
              <GlassCard className="h-full p-6">
                <p aria-hidden className="text-[2.6rem] leading-none font-extralight tracking-[-0.06em] text-flare">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-5 text-[1.2rem] font-normal text-fg">{p.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-body/80">{p.text}</p>
              </GlassCard>
            </Reveal>
          ))}
        </ol>
      </div>

      <div className="mt-[clamp(3.5rem,7vw,6rem)]">
        <h3 className="text-[0.78rem] font-medium tracking-[0.18em] text-muted uppercase">What we do</h3>
        <ul className="mt-6 grid gap-x-8 gap-y-8 border-t border-glass-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {activities.map((a, i) => (
            <Reveal as="li" key={a.title} delay={i * 0.06} className="relative pl-7">
              <span aria-hidden className="absolute top-[0.45rem] left-0 size-3 rounded-full bg-flare shadow-[0_0_16px_rgb(245_124_72/0.8)]" />
              <h4 className="text-[1.08rem] font-normal text-fg">{a.title}</h4>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-body/80">{a.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
