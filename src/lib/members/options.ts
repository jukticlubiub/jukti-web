/** The registration form's choices, the same as the Jukti Reg app's, so both apps store the same values. Safe to import anywhere. */

export const interestOptions = [
  "Anchoring & Public Speaking",
  "Event Management",
  "Logistics & Operations",
  "Social Media Management",
  "Cultural Performance",
  "Photography & Videography",
  "Content Writing & PR",
  "Graphic Design (Canva not accepted)",
] as const;

export const coCurricularOptions = [
  "Robotics",
  "Hackathon",
  "Cybersecurity & CTF",
  "AI & Machine Learning",
  "App & Web Development",
  "Game Development",
  "Research & Publication",
  "Startup & Entrepreneurship",
  "Quiz & Olympiad",
] as const;

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const paymentMethods = ["Bkash", "Cash"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const memberStatuses = ["pending", "approved", "rejected", "lapsed"] as const;
export type MemberStatus = (typeof memberStatuses)[number];

export const statusInfo: Record<MemberStatus, { label: string; tone: "amber" | "green" | "red" | "neutral" }> = {
  pending: { label: "Pending approval", tone: "amber" },
  approved: { label: "Member", tone: "green" },
  rejected: { label: "Needs attention", tone: "red" },
  lapsed: { label: "Lapsed", tone: "neutral" },
};

/** The admin panel's pill colour for each status. */
export const statusPillTone = { pending: "orange", approved: "green", rejected: "red", lapsed: "grey" } as const satisfies Record<MemberStatus, string>;

/** Where the fee goes, as the registration app tells members (bKash, personal number). */
export const bkashNumber = "01760244646";
