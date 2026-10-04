import Link from "next/link";
import { JuroSpot } from "@/components/juro/JuroSpot";
import { PillButton } from "@/components/ui/PillButton";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";

/** "Our History" from the homepage design. Sits on the planet's dark body as the hero scrolls away. */
export function History() {
  return (
    <section
      id="history"
      aria-labelledby="history-title"
      className="relative z-10 px-[clamp(1.25rem,8vw,10rem)] pt-[clamp(2.5rem,2.3vw,4rem)] pb-[clamp(5rem,10vw,12rem)] text-center"
    >
      <h2 id="history-title" className="font-heading text-[clamp(2.1rem,4.1vw,5rem)]">
        <MaskReveal>Our History</MaskReveal>
      </h2>

      <div className="mx-auto mt-[clamp(2.25rem,5.4vw,6.5rem)] max-w-[100rem] space-y-[1.55em] text-[clamp(1.05rem,1.77vw,2.1rem)] leading-[1.63] tracking-[-0.02em] text-body">
        <Reveal as="p">
          JUKTI – Club of Computer Science and Engineering (CSE), Independent University, Bangladesh (IUB), was
          founded in 2014 with the vision of fostering innovation, creativity, and technical excellence among CSE
          students.
        </Reveal>
        <Reveal as="p" delay={0.05}>
          The idea was conceived during a departmental trip to Kuakata by{" "}
          <Link href="/about/dr-ali-shihab-sabbir" className="font-medium text-fg underline decoration-flare/50 underline-offset-[0.2em] transition-colors hover:text-flare">
            Late Dr. Ali Shihab Sabbir Sir
          </Link>, then Dean of the School
          of Engineering and Technology. He envisioned a platform that would help students grow beyond the classroom
          and proposed the name “JUKTI,” meaning “logic”, a fundamental concept in computer science.
        </Reveal>
        <Reveal as="p" delay={0.05}>
          JUKTI was established under Founding Faculty Advisor Raihan Bin Rafique Sir and Founding President Rakib
          Hassan Rocky. One of its early milestones was organizing the NASA Space Apps Challenge at IUB in 2016, its
          first national-level event.
        </Reveal>
        <Reveal as="p" delay={0.05}>
          Today, JUKTI continues to carry forward Dr. Sabbir Sir’s legacy by empowering students, nurturing technical
          talent, and creating opportunities for learning, innovation, and collaboration.
        </Reveal>
      </div>

      <div className="mt-[clamp(2.5rem,4vw,5rem)] grid items-center justify-items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <span aria-hidden className="hidden md:block" />
        <Reveal>
          <PillButton href="/about" variant="ghost">
            Read our story
          </PillButton>
        </Reveal>
        <JuroSpot name="history" className="md:justify-self-end" />
      </div>
    </section>
  );
}
