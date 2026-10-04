import type { Metadata } from "next";
import { CampusMapSection } from "@/components/contact/CampusMapSection";
import { ContactForm } from "@/components/contact/ContactForm";
import { SocialCards } from "@/components/contact/SocialCards";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { MailIcon } from "@/components/ui/icons";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSocials } from "@/lib/content/queries";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Reach JUKTI, the Club of CSE at IUB, on Facebook, Instagram, LinkedIn or by email, and find us at Independent University, Bangladesh in Bashundhara, Dhaka.",
};

export default async function ContactPage() {
  const { email } = await getSocials();
  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />

      <section aria-labelledby="contact-title" className="relative px-5 pt-[clamp(8.5rem,14.5vw,18rem)] text-center">
        <h1 id="contact-title" className="font-heading text-[clamp(2.1rem,5.87vw,7.4rem)]">
          <MaskReveal>
            CONTACT <span className="text-flare">US</span>
          </MaskReveal>
        </h1>
        <Reveal
          as="p"
          delay={0.15}
          className="mt-[0.35em] text-[clamp(1.1rem,2.6vw,3rem)] leading-tight font-light tracking-[-0.03em] text-fg"
        >
          Say Hello to the JUKTIverse
        </Reveal>
      </section>

      <div className="relative mx-auto grid max-w-[92rem] gap-[clamp(5rem,9vw,9rem)] px-5 pt-[clamp(3rem,5vw,6rem)] lg:px-[clamp(2rem,4vw,5rem)]">
        <section
          aria-labelledby="message-title"
          className="grid gap-[clamp(2rem,3vw,3.25rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-[clamp(3rem,5vw,6rem)]"
        >
          <div>
            <SectionHeading id="message-title" title="Send a Message" />
            <Reveal as="p" delay={0.05} className="mt-5 max-w-xl text-[clamp(1.02rem,1.2vw,1.2rem)] leading-relaxed text-body">
              Questions about joining, an idea for an event, or a partnership in mind? Write to us here and it goes straight to
              the panel’s inbox.
            </Reveal>
            <Reveal delay={0.1} className="mt-8 text-body">
              <p className="text-[0.78rem] font-medium tracking-[0.16em] text-muted uppercase">Prefer your own email app?</p>
              <a
                href={`mailto:${email}`}
                className="mt-2.5 inline-flex items-center gap-2.5 text-[1.05rem] text-fg transition-colors hover:text-flare"
              >
                <MailIcon className="text-flare" />
                {email}
              </a>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="glass-card relative p-6 sm:p-8">
            <ContactForm />
          </Reveal>
        </section>

        <section aria-labelledby="reach-title">
          <SectionHeading id="reach-title" title="Reach Us" />
          <Reveal as="p" delay={0.05} className="mt-5 max-w-2xl text-[clamp(1.02rem,1.2vw,1.2rem)] leading-relaxed text-body">
            Follow the club for announcements, photos and opportunities, or message us wherever suits you.
          </Reveal>
          <div className="mt-[clamp(2rem,3vw,3.25rem)]">
            <SocialCards />
          </div>
        </section>

        <section aria-labelledby="find-title">
          <SectionHeading id="find-title" title="Find Us" />
          <Reveal as="p" delay={0.05} className="mt-5 max-w-2xl text-[clamp(1.02rem,1.2vw,1.2rem)] leading-relaxed text-body">
            JUKTI lives at Independent University, Bangladesh, in Bashundhara, Dhaka. Drag, tilt and zoom the map to look around
            campus.
          </Reveal>
          <Reveal delay={0.1} className="mt-[clamp(2rem,3vw,3.25rem)]">
            <CampusMapSection campus={site.campus} />
          </Reveal>
        </section>
      </div>
    </div>
  );
}
