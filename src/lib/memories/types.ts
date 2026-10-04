export const memoryRelations = [
  { value: "student", label: "Student" },
  { value: "colleague", label: "Colleague" },
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
] as const;

export type MemoryRelation = (typeof memoryRelations)[number]["value"];

export const memoryLimits = { name: 80, affiliation: 80, message: { min: 20, max: 2000 } } as const;

export type Memory = {
  id: string;
  name: string;
  relation: MemoryRelation;
  /** e.g. "CSE, 2012". */
  affiliation: string | null;
  message: string;
  /** When it went up on the page (ISO). */
  sharedAt: string;
};

export type MemoryField = "name" | "relation" | "affiliation" | "message" | "email";

export type MemoryFormState = {
  status: "idle" | "error" | "sent";
  values?: Partial<Record<MemoryField, string>>;
  fieldErrors?: Partial<Record<MemoryField, string>>;
  error?: string;
  /** Development without Supabase: shown straight away instead of awaiting review. */
  preview?: boolean;
};
