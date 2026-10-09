/**
 * Alumni shown in the "Alumni Network" section of /team.
 *
 * Each entry reads as "<role> <term>" under the name, e.g. "Executive 2024-25".
 * Photos go in public/alumni/ (a head-and-shoulders cut-out works best; it's cropped
 * to a circle and shown in black and white over the club orange). `email` and `links`
 * (LinkedIn, a website, Behance...) show as small icon buttons under the name.
 */
export type Alumnus = {
  id: string;
  name: string;
  role: string;
  term: string;
  photo?: string;
  email?: string;
  links?: string[];
  /** Former faculty advisors are listed apart from the alumni. Missing: alumnus. */
  kind?: "alumnus" | "former_advisor";
};

const PLACEHOLDER_COUNT = 8;

export const alumni: Alumnus[] = [
  { id: "istiak-hossain", name: "Istiak Hossain", role: "Executive", term: "2024-25" },
  ...Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => {
    const n = String(i + 2).padStart(2, "0");
    return { id: `alumnus-${n}`, name: `Alumni ${n}`, role: "Executive", term: "2024-25" };
  }),
];
