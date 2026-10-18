import type { EventPhoto, JuktiEvent } from "@/lib/events/types";

/**
 * SAMPLE events, shown only until Supabase is connected (NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). After that, events come from the database and
 * this file is ignored. The titles, dates, venues and numbers here are placeholders
 * for reviewing the design, not real club events.
 *
 * Times carry Dhaka's offset (+06:00). A cover of null draws the site's cover art.
 */
type SampleEvent = Omit<JuktiEvent, "id" | "photoCount" | "rsvp"> & {
  rsvp?: Partial<JuktiEvent["rsvp"]>;
  photos?: number;
};

const noRsvp: JuktiEvent["rsvp"] = { enabled: false, deadline: null, capacity: null, registered: 0, waitlisted: 0, audience: "iub", fields: {}, questions: [] };

const samples: SampleEvent[] = [
  {
    slug: "code-sprint-2026",
    title: "Code Sprint 2026: Online Round",
    summary: "A week-long online round of algorithmic problems. The top 40 go through to the on-campus final.",
    description:
      "Code Sprint is JUKTI's flagship programming contest, and it starts online. Solve as many problems as you can at your own pace during the week; the leaderboard decides who makes the on-campus final.\n\nProblems range from beginner friendly to properly hard, so first-semester students and seasoned competitive programmers both have something to chase. Any language supported by the judge is fine.\n\nRSVP to get the contest link, the rules and the final's details in your inbox.",
    category: "contest",
    startsAt: "2026-09-26T10:00:00+06:00",
    endsAt: "2026-10-03T23:59:00+06:00",
    venue: "Online",
    cover: null,
    agenda: [
      { time: "Sat 26 Sep, 10:00 AM", title: "Round opens", detail: "The problem set goes live on the judge." },
      { time: "Thu 1 Oct, 11:59 PM", title: "RSVP closes" },
      { time: "Sat 3 Oct, 11:59 PM", title: "Round closes", detail: "Finalists are announced the following week." },
    ],
    recap: null,
    rsvp: { enabled: true, deadline: "2026-10-01T23:59:00+06:00", registered: 212 },
  },
  {
    slug: "intro-to-competitive-programming",
    title: "Intro to Competitive Programming",
    summary: "Your first steps into contests: reading problems, thinking in complexity, and writing fast, correct C++.",
    description:
      "New to contests? This hands-on workshop walks through how a problem is judged, how to estimate whether a solution is fast enough, and the handful of C++ tricks that make contest code short and reliable.\n\nBring a laptop with a C++ compiler installed. We'll solve problems together and leave you with a practice list for the weeks after.",
    category: "workshop",
    startsAt: "2026-10-01T14:30:00+06:00",
    endsAt: "2026-10-01T17:00:00+06:00",
    venue: "CSE Lab, IUB",
    cover: null,
    agenda: [
      { time: "2:30 PM", title: "How contests work", detail: "Judges, verdicts and reading a problem statement." },
      { time: "3:15 PM", title: "Complexity in practice" },
      { time: "3:45 PM", title: "Break" },
      { time: "4:00 PM", title: "Live problem solving", detail: "Three problems, solved together from scratch." },
    ],
    recap: null,
    rsvp: { enabled: true, capacity: 60, registered: 47 },
  },
  {
    slug: "careers-in-ai-seminar",
    title: "Careers in AI and Research",
    summary: "Alumni working in industry labs and graduate programs on how they got there, and what they'd do again.",
    description:
      "A panel of JUKTI alumni now working in AI teams and research groups talk about their paths from IUB: choosing a thesis topic, publishing as an undergraduate, applying for graduate school, and landing industry roles.\n\nThe second half is an open Q&A. Send your questions in advance through the RSVP and we'll make sure the panel gets to them.",
    category: "seminar",
    startsAt: "2026-10-08T15:00:00+06:00",
    endsAt: "2026-10-08T17:00:00+06:00",
    venue: "IUB Auditorium",
    cover: null,
    agenda: [
      { time: "3:00 PM", title: "Welcome" },
      { time: "3:10 PM", title: "Panel discussion" },
      { time: "4:15 PM", title: "Open Q&A" },
    ],
    recap: null,
    rsvp: { enabled: true, capacity: 300, registered: 164 },
  },
  {
    slug: "hack-the-juktiverse-2026",
    title: "Hack the JUKTIverse 2026",
    summary: "24 hours, teams of up to four, and one brief revealed at the opening. Food and caffeine included.",
    description:
      "Our overnight hackathon is back. Form a team of up to four, hear the brief at the opening ceremony, and build until the next morning. Mentors will be on the floor all night.\n\nEvery seat is taken, but plans change: join the waitlist and you'll move up automatically if someone cancels.",
    category: "hackathon",
    startsAt: "2026-10-24T09:00:00+06:00",
    endsAt: "2026-10-25T09:00:00+06:00",
    venue: "IUB Multipurpose Hall",
    cover: null,
    agenda: [
      { time: "Sat 9:00 AM", title: "Check-in and team formation" },
      { time: "Sat 10:00 AM", title: "Opening and brief" },
      { time: "Sat 10:30 AM", title: "Hacking starts" },
      { time: "Sun 7:00 AM", title: "Submissions close" },
      { time: "Sun 8:00 AM", title: "Demos and awards" },
    ],
    recap: null,
    rsvp: {
      enabled: true,
      deadline: "2026-10-20T23:59:00+06:00",
      capacity: 120,
      registered: 120,
      waitlisted: 9,
      audience: "open",
      fields: { department: "optional", phone: "required", blood_group: "optional" },
      questions: [
        { id: "q_team", label: "Team name (if you have one)", type: "short", options: [], required: false },
        { id: "q_track", label: "Which track?", type: "select", options: ["AI/ML", "Web", "Mobile", "Open"], required: true },
        { id: "q_needs", label: "Dietary needs", type: "checkbox", options: ["Halal", "Vegetarian", "None"], required: false },
      ],
    },
  },
  {
    slug: "freshers-game-night",
    title: "Freshers' Game Night",
    summary: "Board games, a gaming corner and snacks. Come meet the JUKTI panel and the rest of your batch.",
    description:
      "No talks, no slides. Just an evening of board games, a console corner and snacks, and a relaxed way to meet the people you'll be sharing labs with for the next four years.\n\nOpen to everyone, no RSVP needed. Drop in any time.",
    category: "social",
    startsAt: "2026-11-05T17:00:00+06:00",
    endsAt: "2026-11-05T20:00:00+06:00",
    venue: "IUB Campus",
    cover: null,
    agenda: [],
    recap: null,
  },
  {
    slug: "orientation-autumn-2026",
    title: "JUKTI Orientation, Autumn 2026",
    summary: "Welcoming the new CSE batch into the JUKTIverse: the club, the panel, and a year of plans.",
    description:
      "Our orientation for new CSE students introduced the club, its wings and the executive panel, followed by a walk through the year's events.",
    category: "orientation",
    startsAt: "2026-09-13T10:00:00+06:00",
    endsAt: "2026-09-13T13:00:00+06:00",
    venue: "IUB Auditorium",
    cover: null,
    agenda: [],
    recap:
      "A full auditorium to start the semester. Thank you to everyone who came, and welcome to the JUKTIverse. Photos from the day are below.",
    rsvp: { enabled: true, capacity: 400, registered: 356 },
    photos: 14,
  },
  {
    slug: "nextjs-bootcamp",
    title: "Web Dev Bootcamp: Next.js from Zero",
    summary: "Two days from an empty folder to a deployed full-stack app.",
    description: "A two-day bootcamp covering React fundamentals, routing, data fetching and deployment.",
    category: "workshop",
    startsAt: "2026-08-20T14:00:00+06:00",
    endsAt: "2026-08-21T17:00:00+06:00",
    venue: "CSE Lab, IUB",
    cover: null,
    agenda: [],
    recap: "Two days, one deployed app per attendee. The slides and starter code were shared with everyone who took part.",
    rsvp: { enabled: true, capacity: 50, registered: 50 },
    photos: 8,
  },
  {
    slug: "intra-iub-programming-contest-2026",
    title: "Intra-IUB Programming Contest 2026",
    summary: "Five hours, twelve problems, and the campus's best teams on the leaderboard.",
    description: "The yearly on-campus team contest, open to every IUB student.",
    category: "contest",
    startsAt: "2026-06-13T10:00:00+06:00",
    endsAt: "2026-06-13T15:00:00+06:00",
    venue: "CSE Lab, IUB",
    cover: null,
    agenda: [],
    recap: "A close finish at the top of the leaderboard. Congratulations to every team that took part.",
    rsvp: { enabled: true, capacity: 90, registered: 84 },
    photos: 10,
  },
  {
    slug: "iftar-alumni-meetup-2026",
    title: "Iftar & Alumni Meetup",
    summary: "Current members and alumni sharing iftar and stories from a decade of JUKTI.",
    description: "An evening iftar bringing together current members and JUKTI alumni.",
    category: "social",
    startsAt: "2026-03-07T17:30:00+06:00",
    endsAt: "2026-03-07T20:00:00+06:00",
    venue: "IUB Campus",
    cover: null,
    agenda: [],
    recap: null,
    photos: 6,
  },
  {
    slug: "git-github-essentials",
    title: "Git & GitHub Essentials",
    summary: "Branches, pull requests and fixing the mistakes everyone makes at least once.",
    description: "A practical introduction to version control for course projects and beyond.",
    category: "workshop",
    startsAt: "2026-02-12T14:30:00+06:00",
    endsAt: "2026-02-12T16:30:00+06:00",
    venue: "CSE Lab, IUB",
    cover: null,
    agenda: [],
    recap: null,
  },
  {
    slug: "jukti-hackathon-2025",
    title: "JUKTI Hackathon 2025",
    summary: "An overnight build sprint that turned a room of strangers into teams.",
    description: "Our 2025 overnight hackathon.",
    category: "hackathon",
    startsAt: "2025-11-21T09:00:00+06:00",
    endsAt: "2025-11-22T09:00:00+06:00",
    venue: "IUB Multipurpose Hall",
    cover: null,
    agenda: [],
    recap: "Twenty-four hours, dozens of demos, and a lot of coffee.",
    photos: 12,
  },
  {
    slug: "orientation-autumn-2025",
    title: "JUKTI Orientation, Autumn 2025",
    summary: "Welcoming the Autumn 2025 batch to the club.",
    description: "Our orientation for the Autumn 2025 batch of CSE students.",
    category: "orientation",
    startsAt: "2025-09-14T10:00:00+06:00",
    endsAt: "2025-09-14T13:00:00+06:00",
    venue: "IUB Auditorium",
    cover: null,
    agenda: [],
    recap: null,
    photos: 9,
  },
  {
    slug: "cybersecurity-101",
    title: "Cybersecurity 101",
    summary: "How attacks actually happen, and the habits that stop most of them.",
    description: "An introductory seminar on security for students and developers.",
    category: "seminar",
    startsAt: "2025-07-17T15:00:00+06:00",
    endsAt: "2025-07-17T17:00:00+06:00",
    venue: "IUB Auditorium",
    cover: null,
    agenda: [],
    recap: null,
  },
];

export const sampleEvents: JuktiEvent[] = samples.map(({ photos = 0, rsvp, ...event }) => ({
  ...event,
  id: event.slug,
  photoCount: photos,
  rsvp: { ...noRsvp, ...rsvp, enabled: rsvp?.enabled ?? false },
}));

// A mix of landscape, portrait and square frames, like a real set of event photos.
const PHOTO_SHAPES: [number, number][] = [
  [1600, 1067],
  [1067, 1600],
  [1600, 1200],
  [1600, 1600],
  [1600, 900],
  [1600, 1067],
  [1200, 1600],
];

export function samplePhotos(slug: string): EventPhoto[] {
  const event = sampleEvents.find((e) => e.slug === slug);
  if (!event) return [];
  return Array.from({ length: event.photoCount }, (_, i) => {
    const [width, height] = PHOTO_SHAPES[i % PHOTO_SHAPES.length];
    return { id: `${slug}-${i + 1}`, alt: `${event.title}, photo ${i + 1}`, width, height };
  });
}
