import type { Metadata } from "next";
import { Hero } from "@/components/hero/Hero";
import { History } from "@/components/sections/History";
import { Juro } from "@/components/juro/Juro";
import { JoinCommunity } from "@/components/sections/JoinCommunity";
import { getSocials, getTeam } from "@/lib/content/queries";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  description:
    "JUKTI is the Club of Computer Science and Engineering (CSE) at Independent University, Bangladesh (IUB): workshops, hackathons, seminars, the Academic Helpline and the largest CSE student community at IUB since 2014.",
  path: "/",
});

export default async function HomePage() {
  const [{ members }, socials] = await Promise.all([getTeam(), getSocials()]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(socials)).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <History />
      <JoinCommunity members={members.filter((m) => m.kind === "executive")} />
      <Juro />
    </>
  );
}

/**
 * schema.org Organization and WebSite: tells search engines what JUKTI is, its logo and
 * social profiles, and the site's name (shown above the result instead of the address).
 */
function structuredData(socials: { facebook: string; instagram: string; linkedin: string; email: string }) {
  const organization = {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: "JUKTI – Club of Computer Science and Engineering, Independent University, Bangladesh",
    alternateName: ["JUKTI IUB", "JUKTI, Club of CSE, IUB", "Club of CSE, IUB", "IUB CSE Club"],
    description: site.description,
    url: site.url,
    logo: { "@type": "ImageObject", url: `${site.url}/brand/jukti-logo-512.png`, width: 512, height: 512 },
    foundingDate: "2014",
    email: socials.email,
    sameAs: [socials.facebook, socials.instagram, socials.linkedin].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.campus.address[0],
      addressLocality: "Dhaka",
      postalCode: "1229",
      addressCountry: "BD",
    },
    parentOrganization: { "@type": "CollegeOrUniversity", name: site.campus.name, url: "https://iub.ac.bd" },
  };
  const website = {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    alternateName: ["JUKTI IUB", site.fullName],
    url: `${site.url}/`,
    publisher: { "@id": `${site.url}/#organization` },
    inLanguage: "en",
  };
  return { "@context": "https://schema.org", "@graph": [organization, website] };
}
