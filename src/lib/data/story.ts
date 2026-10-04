/**
 * The chapters of the About page's story map, in order. Sources: the club's own history
 * (as in "Our History" on the homepage), IUB's club page
 * (https://iub.ac.bd/campus-life/clubs-at-iub/jukti---the-iub-cse-club), IUB news
 * (4 July 2015 programming contest) and The Business Standard (24 July 2026 industry visit).
 *
 * Each chapter shows a photo placeholder until a photo is added: drop the image in
 * public/about/ and set `photo` (e.g. { src: "/about/kuakata.jpg", alt: "..." }). Photos
 * are shown in black and white until the story reaches them.
 */
export type StoryChapter = {
  id: string;
  /** Short line above the number, e.g. a place or a year. */
  kicker: string;
  title: string;
  body: string;
  /** Floats over the picture. */
  badge: string;
  /** What the photo for this chapter should show (shown in the placeholder). */
  photoHint: string;
  photo?: { src: string; alt: string };
  link?: { href: string; label: string };
};

export const storyChapters: StoryChapter[] = [
  {
    id: "the-idea",
    kicker: "Kuakata",
    title: "An idea by the sea",
    body: "On a departmental trip to Kuakata, Late Dr. Ali Shihab Sabbir Sir, then Dean of the School of Engineering and Computer Science, imagined a place where CSE students could grow beyond the classroom.",
    badge: "The idea",
    photoHint: "Dr. Sabbir with students on the Kuakata trip",
    photo: { src: "/about/sabbir/smiling.jpg", alt: "Dr. Ali Shihab Sabbir, smiling, beside a window" },
    link: { href: "/about/dr-ali-shihab-sabbir", label: "In memory of Dr. Sabbir" },
  },
  {
    id: "the-name",
    kicker: "যুক্তি",
    title: "A name that means logic",
    body: "He proposed the name “JUKTI”, meaning logic: a fundamental concept in computer science, and the way of thinking the club would stand for.",
    badge: "JUKTI = Logic",
    photoHint: "An early JUKTI banner or the first logo sketch",
  },
  {
    id: "founded",
    kicker: "2014",
    title: "The club is founded",
    body: "JUKTI, the Club of Computer Science and Engineering at IUB, was established in 2014 under Founding Faculty Advisor Raihan Bin Rafique Sir and Founding President Rakib Hassan Rocky, around three guiding principles: skill, networking and knowledge.",
    badge: "Est. 2014",
    photoHint: "The founding committee, 2014",
  },
  {
    id: "programming-contest-2015",
    kicker: "2015",
    title: "Learning by competing",
    body: "On 4 July 2015, JUKTI and the Department of CSE ran the Intra-IUB Programming Contest: 24 teams from CSE and EEE, 13 problems, five hours. It capped a programming training camp that had started that March.",
    badge: "Intra-IUB Contest",
    photoHint: "Teams at the 2015 Intra-IUB Programming Contest",
  },
  {
    id: "first-national-event",
    kicker: "2016",
    title: "Our first national stage",
    body: "One of the club’s early milestones: organizing the NASA Space Apps Challenge at IUB in 2016, JUKTI’s first national-level event.",
    badge: "Space Apps 2016",
    photoHint: "Participants at NASA Space Apps Challenge 2016, IUB",
  },
  {
    id: "industry-visit-2026",
    kicker: "2026",
    title: "Beyond the classroom",
    body: "On 16 July 2026, JUKTI took 56 CSE students and two faculty members to Walton Digi-Tech Industries in Kaliakoir, Gazipur: through the display centre, the data centre and the circuit-board production line.",
    badge: "Industry Visit 2026",
    photoHint: "The group at Walton Digi-Tech, July 2026",
  },
  {
    id: "today",
    kicker: "Today",
    title: "The largest CSE community at IUB",
    body: "JUKTI runs workshops, contests and events, community service and sports, and keeps a growing alumni network close: graduates in software, data science, research and business who come back to mentor the next batch.",
    badge: "Today",
    photoHint: "A recent JUKTI event, full house",
  },
];
