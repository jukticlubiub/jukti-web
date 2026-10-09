import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { banglaFont } from "@/app/fonts";
import { MemoryForm } from "@/components/about/MemoryForm";
import { MemoryWall } from "@/components/about/MemoryWall";
import { LogoMark } from "@/components/brand/Logo";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { ArrowIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { getMemorial } from "@/lib/content/queries";
import { sabbir, selectedWorks, sources, studentProjects } from "@/lib/data/sabbir";

export const metadata: Metadata = pageMetadata({
  title: "In Memory of Dr. Ali Shihab Sabbir",
  description:
    "Remembering Professor Dr. Ali Shihab Sabbir (died 22 July 2020): teacher, researcher, former Dean at IUB, and the visionary who gave JUKTI its idea and its name.",
  path: "/about/dr-ali-shihab-sabbir",
  image: { url: sabbir.portrait.src, alt: sabbir.portrait.alt },
});

const container = "relative mx-auto max-w-[76rem] px-5 lg:px-[clamp(2rem,4vw,5rem)]";
const eyebrow = "flex items-center gap-2 text-[0.95rem] text-flare";
const heading = "mt-4 text-[clamp(2rem,3.6vw,3.4rem)] leading-[1.05] font-extralight tracking-[-0.04em] text-fg";

export default async function SabbirMemorialPage() {
  const memorial = await getMemorial();
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      {/* Hero */}
      <section aria-labelledby="memorial-title" className={`${container} grid items-center gap-12 pt-[clamp(8rem,12vw,12rem)] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-[clamp(3rem,6vw,6rem)]`}>
        <Reveal immediate className="relative mx-auto w-full max-w-[26rem]">
          <div aria-hidden className="absolute -inset-[14%] rounded-full bg-[radial-gradient(closest-side,rgb(255_170_90/0.28),transparent)]" />
          <figure className="group glass-card relative p-2.5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[14px]">
              <Image
                src={sabbir.portrait.src}
                alt={sabbir.portrait.alt}
                fill
                priority
                sizes="(max-width: 768px) 90vw, 26rem"
                className="object-cover object-[50%_30%] grayscale transition-[filter] duration-1000 group-hover:grayscale-0 [@media(hover:none)]:grayscale-0"
              />
            </div>
          </figure>
        </Reveal>

        <div>
          <p className={eyebrow}>In loving memory</p>
          <h1 id="memorial-title" className="mt-5 text-[clamp(2.6rem,6vw,5.6rem)] leading-[0.95] font-extralight tracking-[-0.05em] text-fg">
            <span className="block text-[0.42em] tracking-[-0.02em] text-body/80">{sabbir.honorific}</span>
            <MaskReveal>Dr. Ali Shihab</MaskReveal>
            <MaskReveal>Sabbir</MaskReveal>
          </h1>
          <Reveal immediate delay={0.2} className="mt-7 space-y-1 text-[1.02rem] text-body/85">
            <p>{sabbir.title}</p>
            <p>{sabbir.role}</p>
            <p className="text-muted">Passed away {sabbir.passed}</p>
          </Reveal>
          <Reveal immediate delay={0.3} as="p" className="mt-8 max-w-xl border-l-2 border-flare/60 pl-5 text-[clamp(1.1rem,1.4vw,1.35rem)] leading-relaxed font-light text-fg">
            He imagined a place where CSE students could grow beyond the classroom, and gave it a name that means logic. Every
            JUKTI gathering since carries a part of that idea.
          </Reveal>
        </div>
      </section>

      {/* Tribute */}
      <section aria-labelledby="tribute-title" className={`${container} mt-[clamp(6rem,12vw,11rem)]`}>
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>A tribute</p>
          <h2 id="tribute-title" className="sr-only">
            A tribute
          </h2>
          <Reveal as="p" className="mt-6 text-[clamp(1.35rem,2.2vw,2rem)] leading-[1.45] font-extralight tracking-[-0.015em] text-fg">
            {memorial.tribute[0]}
          </Reveal>
          <div className="mt-8 space-y-6 text-[clamp(1.02rem,1.2vw,1.15rem)] leading-[1.8] text-body/85">
            {memorial.tribute.slice(1).map((p, i) => (
              <Reveal as="p" key={i} delay={0.05}>
                {p}
              </Reveal>
            ))}
          </div>
          <Reveal as="p" className="mt-10 text-[clamp(1.3rem,2vw,1.7rem)] font-light text-flare">
            {memorial.farewell}
          </Reveal>
        </div>
      </section>

      {/* The idea that became JUKTI */}
      <section aria-labelledby="idea-title" className={`${container} mt-[clamp(6rem,12vw,11rem)] grid items-center gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]`}>
        <div>
          <p className={eyebrow}>
            His idea <span aria-hidden className="inline-block -rotate-45">→</span>
          </p>
          <h2 id="idea-title" className={heading}>
            <MaskReveal>The club that began on a trip</MaskReveal>
          </h2>
          <Reveal className="mt-6 max-w-xl space-y-5 text-[clamp(1.02rem,1.2vw,1.15rem)] leading-[1.8] text-body/85">
            <p>
              On a departmental trip to Kuakata, Dr. Sabbir, then Dean of the School of Engineering and Computer Science,
              envisioned a platform that would help students grow beyond the classroom. He proposed its name: JUKTI, meaning logic, a
              fundamental concept in computer science.
            </p>
            <p>
              JUKTI was founded in 2014. In July 2015, as Dean, he closed its first programming contest with the Department of
              CSE. Today, the club carries his legacy forward by empowering students, nurturing technical talent, and creating
              opportunities for learning, innovation and collaboration.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            <Link href="/about" className="btn-pill btn-ghost text-[0.85rem]">
              Our story
              <ArrowIcon />
            </Link>
            <Link href="/about#mark-story-title" className="btn-pill btn-ghost text-[0.85rem]">
              How our mark was made
            </Link>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="relative mx-auto grid aspect-square w-full max-w-[22rem] place-items-center">
          <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(245_124_72/0.3),transparent)]" />
          <div className="relative text-center">
            <LogoMark className="mx-auto w-[46%] text-flare drop-shadow-[0_0_30px_rgb(245_124_72/0.5)]" title="JUKTI" />
            <p className={`mt-6 text-[2.4rem] text-fg ${banglaFont.className}`} lang="bn">
              যুক্তি
            </p>
            <p className="mt-1 text-[0.85rem] tracking-[0.18em] text-muted uppercase">“Logic”</p>
          </div>
        </Reveal>
      </section>

      {/* A life of learning */}
      <section aria-labelledby="life-title" className={`${container} mt-[clamp(6rem,12vw,11rem)]`}>
        <p className={eyebrow}>His journey</p>
        <h2 id="life-title" className={heading}>
          <MaskReveal>A life of learning</MaskReveal>
        </h2>
        <ol className="relative mt-12 ml-2 border-l border-white/15 md:ml-[7.5rem]">
          {memorial.life.map((e, i) => (
            <Reveal as="li" key={`${e.year}-${e.title}`} delay={Math.min(i, 4) * 0.04} className="relative pb-10 pl-8 last:pb-0">
              <span aria-hidden className="absolute top-[0.5rem] -left-[0.4rem] size-3 rounded-full bg-flare shadow-[0_0_14px_rgb(245_124_72/0.8)]" />
              <p className="text-[0.95rem] font-medium tracking-[0.06em] text-flare md:absolute md:top-[0.15rem] md:-left-[7.5rem] md:w-[5.5rem] md:text-right">
                {e.year}
              </p>
              <h3 className="mt-1 text-[1.2rem] font-normal text-fg md:mt-0">{e.title}</h3>
              <p className="mt-1.5 max-w-2xl leading-relaxed text-body/80">{e.detail}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Learning how to reason */}
      <section aria-labelledby="ccse-title" className={`${container} mt-[clamp(6rem,12vw,11rem)]`}>
        <div className="glass-card relative overflow-hidden p-[clamp(1.75rem,4vw,3.5rem)]">
          <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(245_124_72/0.25),transparent)]" />
          <p className={eyebrow}>2015 · Center for Cognitive Skill Enhancement</p>
          <h2 id="ccse-title" className={heading}>
            <MaskReveal>Learning how to reason</MaskReveal>
          </h2>
          <Reveal className="mt-6 grid gap-6 text-[clamp(1.02rem,1.2vw,1.15rem)] leading-[1.8] text-body/85 md:grid-cols-2 md:gap-10">
            <p>
              On 20 April 2015, IUB inaugurated the Center for Cognitive Skill Enhancement, with the theme “Learning How to
              Reason”. Funded by a grant of 25 million taka under the Higher Education Quality Enhancement Project, the centre
              was coordinated by Dr. Sabbir, then Dean, who later became its Executive Director.
            </p>
            <p>
              At its opening he described how the centre would help students of different backgrounds collaborate under the
              broad umbrella of cognition, and how cross-pollinating ideas could reverse the growing compartmentalization of
              knowledge in a world that is ever more connected. Through it, he inspired many young minds to pursue research.
            </p>
          </Reveal>
        </div>
      </section>

      {/* His work */}
      <section aria-labelledby="work-title" className={`${container} mt-[clamp(6rem,12vw,11rem)]`}>
        <p className={eyebrow}>His work</p>
        <h2 id="work-title" className={heading}>
          <MaskReveal>Scholar and mentor</MaskReveal>
        </h2>
        <Reveal className="mt-8 flex flex-wrap gap-2">
          {memorial.interests.map((t) => (
            <span key={t} className="rounded-full border border-glass-border bg-glass px-4 py-2 text-[0.9rem] text-body">
              {t}
            </span>
          ))}
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div>
            <h3 className="text-[0.78rem] font-medium tracking-[0.18em] text-muted uppercase">Selected works</h3>
            <ul className="mt-4 divide-y divide-glass-border border-y border-glass-border">
              {selectedWorks.map((w) => (
                <Reveal as="li" key={w.title} className="grid gap-1 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-6">
                  <span className="text-[0.95rem] text-flare">{w.year}</span>
                  <span>
                    <span className="block leading-snug text-fg">{w.title}</span>
                    <span className="mt-1.5 block text-[0.9rem] text-muted">
                      {w.kind === "Patent" && <span className="mr-2 rounded-full bg-lava/20 px-2 py-0.5 text-[0.75rem] text-flare">Patent</span>}
                      {w.venue}
                    </span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[0.78rem] font-medium tracking-[0.18em] text-muted uppercase">Student projects he guided</h3>
            <Reveal className="mt-4 flex flex-wrap gap-2">
              {studentProjects.map((p) => (
                <span key={p} className="rounded-[10px] border border-glass-border bg-white/[0.03] px-3 py-2 text-[0.88rem] text-body/90">
                  {p}
                </span>
              ))}
            </Reveal>
            <p className="mt-5 text-[0.95rem] leading-relaxed text-body/75">
              He nurtured young talent closely and meticulously, and many of his students now inspire others.
            </p>
          </div>
        </div>
      </section>

      {/* Photos */}
      <section aria-labelledby="photos-title" className={`${container} mt-[clamp(6rem,12vw,11rem)]`}>
        <p className={eyebrow}>Remembering</p>
        <h2 id="photos-title" className={heading}>
          <MaskReveal>In pictures</MaskReveal>
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-[1.3fr_0.9fr] lg:grid-cols-[1.3fr_0.9fr_1.4fr]">
          {memorial.photos.map((p, i) => (
            <Reveal as="li" key={p.src} delay={i * 0.08} className={i === 2 ? "sm:col-span-2 lg:col-span-1" : undefined}>
              <figure className="group glass-card relative h-full p-2">
                <div className="relative aspect-[4/3] h-full overflow-hidden rounded-[14px] lg:aspect-auto lg:min-h-[19rem]">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-[50%_28%] grayscale transition-[filter,scale] duration-1000 group-hover:scale-[1.03] group-hover:grayscale-0 [@media(hover:none)]:grayscale-0"
                  />
                </div>
              </figure>
            </Reveal>
          ))}
        </ul>
        <p className="mt-4 text-[0.85rem] text-muted [@media(hover:none)]:hidden">Hover to see each photo in colour.</p>
      </section>

      {/* Notice */}
      <section aria-labelledby="remember-title" className={`${container} mt-[clamp(6rem,12vw,11rem)] text-center`}>
        <h2 id="remember-title" className="text-[clamp(1.8rem,3vw,2.8rem)] font-extralight tracking-[-0.03em] text-fg">
          He will live on in the works of his students
        </h2>
        <Reveal as="p" className="mx-auto mt-5 max-w-2xl text-[clamp(1.02rem,1.2vw,1.15rem)] leading-[1.8] text-body/80">
          “{memorial.notice}”
          <span className="mt-2 block text-[0.85rem] text-muted">From IUB’s condolence notice, July 2020</span>
        </Reveal>
      </section>

      {/* Memories */}
      <section id="memories" aria-labelledby="memories-title" className={`${container} mt-[clamp(6rem,12vw,11rem)] scroll-mt-28`}>
        <p className={eyebrow}>From his students, colleagues and friends</p>
        <h2 id="memories-title" className={heading}>
          <MaskReveal>Memories</MaskReveal>
        </h2>
        <div className="mt-10">
          <Suspense fallback={<div aria-hidden className="h-40 rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse" />}>
            <MemoryWall />
          </Suspense>
        </div>

        <div id="share-memory" className="mt-[clamp(3.5rem,6vw,5rem)] grid scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-[clamp(3rem,6vw,6rem)]">
          <div>
            <h3 className="text-[clamp(1.5rem,2.4vw,2.2rem)] font-extralight tracking-[-0.03em] text-fg">Share a memory</h3>
            <p className="mt-4 max-w-md leading-relaxed text-body/80">
              Were you his student, colleague or friend? Tell us about a class, a conversation, or something he said that stayed
              with you. Memories appear here once the club has read them.
            </p>
            <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted">
              Have photos of him? Leave your email with your memory, or{" "}
              <Link href="/contact" className="text-flare underline-offset-4 hover:underline">
                write to us
              </Link>
              .
            </p>
          </div>
          <div className="glass-card relative p-6 sm:p-8">
            <MemoryForm />
          </div>
        </div>
      </section>

      {/* Sources */}
      <div className={`${container} mt-[clamp(5rem,9vw,8rem)]`}>
        <div className="border-t border-glass-border pt-6 text-[0.85rem] text-muted">
          <p>Sources</p>
          <ul className="mt-3 space-y-1.5">
            {sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-body hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
            <li>Condolence notices from IUB and from his students and colleagues, collected by JUKTI.</li>
            <li>Memories are shared by visitors and read by the club before they appear.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
