/**
 * The people who built this website (shown on /developers). Photos are in public/developers/.
 * Socials: fill in any of the optional links; empty ones aren't shown.
 */
export type Developer = {
  id: string;
  name: string;
  /** What they did on the website. */
  role: string;
  /** Their position in JUKTI. */
  designation: string;
  photo: string;
  socials: { linkedin?: string; github?: string; facebook?: string; instagram?: string; email?: string; website?: string };
};

/** When the site was created. */
export const siteCreated = "2026-09-20";

export const developers: Developer[] = [
  {
    id: "asif-amin",
    name: "Asif Amin",
    role: "Core Developer",
    designation: "Webmaster, JUKTI",
    photo: "/developers/asif.webp",
    socials: { linkedin: "https://www.linkedin.com/in/asif-amin-091463324", github: "", facebook: "", instagram: "", email: "" },
  },
  {
    id: "zubair-shafin",
    name: "Zubair Shafin",
    role: "UI & UX Design",
    designation: "President, JUKTI",
    photo: "/developers/zubair.webp",
    socials: { linkedin: "https://www.linkedin.com/in/zubair-shafin/", github: "", facebook: "", instagram: "", email: "" },
  },
  {
    id: "raiyan",
    // Add the full name here.
    name: "Raiyan",
    role: "Database Management",
    designation: "Head of PR, JUKTI",
    photo: "/developers/raiyan.webp",
    socials: { linkedin: "https://www.linkedin.com/in/raiyan2004rbr/", github: "", facebook: "", instagram: "", email: "" },
  },
];

export const stack = ["Next.js 16", "React 19", "Tailwind CSS 4", "Supabase", "Three.js", "GSAP", "Motion", "MapLibre", "Vercel"];
