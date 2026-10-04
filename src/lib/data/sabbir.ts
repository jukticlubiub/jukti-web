/**
 * In memory of Professor Dr. Ali Shihab Sabbir, whose idea became JUKTI. Facts come from
 * the `sources` below and from the condolence notices collected by the club (`tributes`);
 * please keep it that way when adding to the page. Photos live in public/about/sabbir/.
 */

export const sabbir = {
  name: "Dr. Ali Shihab Sabbir",
  honorific: "Professor",
  role: "Founding visionary of JUKTI",
  title: "Professor, Department of Computer Science & Engineering, IUB",
  passed: "22 July 2020, New York",
  portrait: { src: "/about/sabbir/portrait.jpg", alt: "Portrait of Professor Dr. Ali Shihab Sabbir", width: 1116, height: 1366 },
};

export type Photo = { src: string; alt: string; width: number; height: number };

export const photos: Photo[] = [
  { src: "/about/sabbir/smiling.jpg", alt: "Dr. Sabbir smiling, beside a window looking out over green hills", width: 1285, height: 942 },
  { src: "/about/sabbir/portrait.jpg", alt: "Dr. Sabbir in a dark shirt at a graduation ceremony", width: 1116, height: 1366 },
  { src: "/about/sabbir/evening-with-colleagues.jpg", alt: "Dr. Sabbir seated on the deck of a boat at night, with colleagues", width: 1500, height: 1000 },
];

/** Condolence notices the club collected after his passing. */
export const tributes = {
  long: [
    "We deeply mourn the untimely demise of Professor Dr. Ali Shihab Sabbir. Professor Sabbir breathed his last in New York on the 22nd of July 2020. Ever so exuberant, Dr. Sabbir, while leading the Center for Cognitive Skill Enhancement at IUB, inspired so many young minds to pursue research, and more so to become more compassionate and well-rounded human beings.",
    "His contribution to the Department of Computer Science and Engineering at IUB is immense, and the wisdom he imparted to many of his students over the years is insurmountable. He nurtured young talents so closely and meticulously that many of them are able to chase their aspirations and are now inspiring others. A brilliant research scholar and an impactful educator, Dr. Sabbir contributed immensely to the field of Distributed and Context-Aware Collaboration with many scholarly publications and patents.",
    "Professor Dr. Ali Shihab Sabbir, in so many ways, was a harbinger of scholarship, an inspiration to his students and peers. His gregarious smile and his companionship as a mentor, colleague and friend will be greatly missed. We hope that he finds solace in his journey beyond life, and may his friends and family find the courage to cope with this grief.",
    "He will live on in the works of many of his students, and Professor Sabbir’s life will be celebrated in the knowledge that he disseminated out into this world.",
  ],
  farewell: "Goodbye Captain! May you find peace.",
  notice:
    "Dr. Sabbir, who joined IUB in July 2006, was an integral part of the Department of Computer Science & Engineering, and was someone respected for his scholarship, kindness and hard work.",
};

export type LifeEvent = { year: string; title: string; detail: string };

export const life: LifeEvent[] = [
  { year: "1994", title: "B.Sc. (Hons) in Physics", detail: "University of Dhaka" },
  { year: "1998", title: "M.S. in Computer Science", detail: "City College of New York, where he went on to teach as an adjunct lecturer until 2004" },
  { year: "2005", title: "Ph.D. in Computer Science", detail: "City University of New York; then a postdoctoral research associate at the US Air Force Research Laboratory’s Information Directorate in Rome, New York" },
  { year: "2006", title: "Joins IUB", detail: "In July, as Assistant Professor in the School of Engineering and Computer Science" },
  { year: "2011", title: "Associate Professor", detail: "The same year, a US patent he co-invented was granted" },
  { year: "2014", title: "JUKTI is founded", detail: "The club he imagined on a trip to Kuakata, under the name he gave it" },
  { year: "2015", title: "Learning how to reason", detail: "As Dean, launches IUB’s Center for Cognitive Skill Enhancement" },
  { year: "2017", title: "Executive Director, CCSE", detail: "Leads the centre’s research collaborations and outreach to young students" },
  { year: "2020", title: "Passes away in New York", detail: "On 22 July, as a Professor of the Department of Computer Science & Engineering at IUB" },
];

export const interests = [
  "Distributed & context-aware collaboration",
  "Real-time systems",
  "Communications",
  "Natural language processing",
  "Bangla language computing",
  "Web applications",
  "Technology for development",
];

export type Work = { year: string; title: string; venue: string; kind: "Patent" | "Paper" };

export const selectedWorks: Work[] = [
  {
    year: "2011",
    title: "Method and Apparatus for Timing Information Flow in a Distributed System",
    venue: "US Patent 7,877,748 B2, with K. Kwiat and K. Ravindran",
    kind: "Patent",
  },
  {
    year: "2016",
    title: "Devising a Strategy for Playing Bangla Hangman (Jhulonto Manob) Based on Character Frequency Distribution",
    venue: "ICIEV 2016, with Aunnoy K. Mutasim and M. Ashraful Amin",
    kind: "Paper",
  },
  {
    year: "2013",
    title: "Bridging Digital Divide: “Village Wireless LAN”, a Low Cost Infrastructure Solution for Digital Communication",
    venue: "ICAEE 2013, with IUB students",
    kind: "Paper",
  },
  {
    year: "2011",
    title: "Birth Record Communicator: A Pathway to Automated Health Data Acquisition System",
    venue: "WISH 2011 at the AMIA Annual Symposium, Washington, DC",
    kind: "Paper",
  },
  {
    year: "2004",
    title: "User Assisted Tools for Concurrency Control in Distributed Multimedia Collaborations",
    venue: "ACM Multimedia 2004, New York, with K. Ravindran",
    kind: "Paper",
  },
  {
    year: "2001",
    title: "Cost-optimal Multicast Trees for Multi-source Data Flows",
    venue: "IEEE INFOCOM 2001, with K. Ravindran, D. Loguinov and G. Bloom",
    kind: "Paper",
  },
];

/** Student projects listed on his IUB faculty profile. */
export const studentProjects = [
  "Stemmer for Bangla Verbs",
  "Black Box: road accident alerts",
  "Village Wireless LAN",
  "Birth Record Communicator",
  "Virtual ATM",
  "IUB Community Mapper",
  "Mobile survey web app",
  "GPS device for GIS",
  "GSM digital energy meter",
  "3D FPS game",
];

export const sources = [
  {
    label: "Ali Shihab Sabbir, PhD: faculty profile, Department of CSE, IUB (archived)",
    href: "https://web.archive.org/web/2019/http://www.cse.iub.edu.bd/faculties/13",
  },
  {
    label: "IUB News: Center for Cognitive Skill Enhancement inaugurated, 20 April 2015 (archived)",
    href: "https://web.archive.org/web/2016/http://www.iub.edu.bd/articles/index/5/Center-for-Cognitive-Skill-Enhancement-Inaugurated",
  },
  {
    label: "IUB News: Dr. Ali Shihab Sabbir appointed as Executive Director of CCSE, 2017 (archived)",
    href: "https://web.archive.org/web/2017/http://www.iub.edu.bd/articles/index/960/Dr-Ali-Shihab-Sabbir-appointed-as-Executive-Director-of-CCSE",
  },
  {
    label: "IUB News: Dept. of CSE hosts Intra IUB Programming Contest, July 2015 (archived)",
    href: "https://web.archive.org/web/2016/http://www.iub.edu.bd/articles/index/335/Dept-of-CSE-Hosts-Intra-IUB-Programming-Contest",
  },
];
