/**
 * The people shown on /team: the faculty advisors (white cards) followed by the
 * executive panel (orange cards).
 *
 * To fill in a person: set `name` and `role`, drop a portrait in public/team/ and set
 * `photo` to its path (e.g. "/team/zubair-shafin.png"), and paste their LinkedIn URL.
 * Portraits look best as transparent PNG cut-outs, about 800x1260; they're shown in
 * black and white over the card color, as in the design. A card without a
 * `linkedin` URL still shows its name on hover but isn't clickable.
 */
export type TeamMember = {
  id: string;
  kind: "advisor" | "executive";
  name: string;
  role: string;
  photo?: string;
  linkedin?: string;
};

/** Shown as "Executive Board 2026-27" above the portraits. */
export const boardTerm = "2026-27";

const TOTAL_CARDS = 16;

// Advisors and the Vice President as listed on the club's page at iub.ac.bd.
const advisors: TeamMember[] = [
  { id: "rashedur-rahman", kind: "advisor", name: "Md. Rashedur Rahman, D. Eng.", role: "Faculty Advisor" },
  { id: "nabarun-halder", kind: "advisor", name: "Nabarun Halder", role: "Faculty Co-Advisor" },
];

const namedExecutives: TeamMember[] = [
  { id: "zubair-shafin", kind: "executive", name: "Zubair Shafin", role: "President" },
  { id: "jawadul-karim", kind: "executive", name: "Jawadul Karim (Suhan)", role: "Vice President" },
  { id: "sadia-sultana-ananna", kind: "executive", name: "Sadia Sultana Ananna", role: "General Secretary" },
  { id: "delowar-hossain", kind: "executive", name: "Delowar Hossain", role: "Joint Secretary" },
];

const placeholderExecutives: TeamMember[] = Array.from(
  { length: TOTAL_CARDS - advisors.length - namedExecutives.length },
  (_, i) => {
    const n = String(namedExecutives.length + i + 1).padStart(2, "0");
    return { id: `executive-${n}`, kind: "executive", name: `Executive ${n}`, role: "Designation" };
  },
);

export const teamMembers: TeamMember[] = [...advisors, ...namedExecutives, ...placeholderExecutives];
