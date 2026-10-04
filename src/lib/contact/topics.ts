/** What a message is about. Shown as choices on the form and in the email's subject. */
export const contactTopics = [
  { value: "general", label: "General" },
  { value: "joining", label: "Joining JUKTI" },
  { value: "events", label: "Events" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Something else" },
] as const;

export type ContactTopic = (typeof contactTopics)[number]["value"];

export const MESSAGE_MAX = 3000;

export type ContactField = "name" | "email" | "topic" | "message";

export type ContactFormState = {
  status: "idle" | "sent" | "error";
  /** What the visitor typed, so a rejected form keeps it. */
  values?: Partial<Record<ContactField, string>>;
  fieldErrors?: Partial<Record<ContactField, string>>;
  error?: string;
  /** Development without an email key: accepted, but only logged. */
  preview?: boolean;
  /** Where the reply will go, for the confirmation. */
  replyTo?: string;
};
