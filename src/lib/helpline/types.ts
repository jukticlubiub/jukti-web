export const helplineTopics = ["course", "programming", "math", "projects", "career", "other"] as const;
export type HelplineTopic = (typeof helplineTopics)[number];

export const helplineTopicLabels: Record<HelplineTopic, string> = {
  course: "Course help",
  programming: "Programming",
  math: "Math",
  projects: "Projects & thesis",
  career: "Career",
  other: "Other",
};

/** Who answered: a faculty member, a senior student, or a club editor. */
export type HelplineRole = "faculty" | "senior" | "editor";

export const helplineRoleLabels: Record<HelplineRole, string> = {
  faculty: "Faculty",
  senior: "Senior",
  editor: "JUKTI",
};

export type HelplineQuestion = {
  id: string;
  title: string;
  /** Plain text; line breaks are kept. */
  body: string;
  topic: HelplineTopic;
  /** e.g. "CSE 201" */
  course: string | null;
  /** Null when the student asked anonymously. */
  askerName: string | null;
  /** ISO timestamp. */
  createdAt: string;
  answerCount: number;
};

export type HelplineAnswer = {
  id: string;
  questionId: string;
  authorName: string;
  authorRole: HelplineRole;
  body: string;
  createdAt: string;
};

export type Faculty = {
  id: string;
  name: string;
  designation: string;
  room: string | null;
  email: string;
  photoUrl: string | null;
  position: number;
};

/** Length limits, the same as the database's checks (supabase/migrations/…_helpline.sql). */
export const helplineLimits = {
  title: { min: 5, max: 150 },
  body: { min: 20, max: 5000 },
  course: { max: 40 },
  answer: { min: 2, max: 5000 },
} as const;

export const helplinePath = (id: string) => `/helpline/${id}`;
