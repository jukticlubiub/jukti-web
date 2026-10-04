export const site = {
  name: "JUKTI",
  fullName: "JUKTI, Club of CSE, IUB",
  tagline: "The largest CSE Student Community at IUB",
  description:
    "JUKTI is the Club of Computer Science and Engineering at Independent University, Bangladesh. Founded in 2014 to foster innovation, creativity, and technical excellence among CSE students.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  socials: {
    facebook: "https://www.facebook.com/jukti.cse.iub",
    instagram: "https://www.instagram.com/jukti.iub",
    linkedin: "https://www.linkedin.com/company/jukti-iub",
    email: "jukti.iub@gmail.com",
  },
  /** The university, where the club meets. Coordinates from OpenStreetMap. */
  campus: {
    name: "Independent University, Bangladesh",
    address: ["Plot 16, Block B, Aftabuddin Ahmed Road", "Bashundhara R/A, Dhaka 1229", "Bangladesh"],
    lat: 23.8155062,
    lng: 90.42769,
  },
} as const;

export const navLinks = [
  { label: "About Us", href: "/about" },
  { label: "Our Events", href: "/events" },
  { label: "Team Jukti", href: "/team" },
  { label: "Jukti Logs", href: "/logs" },
  { label: "Academic Helpline", href: "/helpline" },
  { label: "In Memoriam", href: "/about/dr-ali-shihab-sabbir" },
] as const;

export const joinLink = { label: "Join Us", href: "/join" } as const;
