import type { MemberStatus, PaymentMethod } from "./options";

/** A member's own record (what they and Membership Managers can see). */
export type Member = {
  id: string;
  email: string;
  name: string;
  iubId: string;
  department: string;
  semester: string | null;
  residenceArea: string;
  contactNumber: string;
  facebookLink: string | null;
  bloodGroup: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  bkashTransactionId: string | null;
  bkashSenderNumber: string | null;
  executiveId: string | null;
  interests: string[];
  coCurricular: string[];
  createdAt: string;
  status: MemberStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  reviewNote: string | null;
  memberNo: string | null;
  secondaryEmail: string | null;
  photoUrl: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  skills: string[];
  showInDirectory: boolean;
  /** Left out of the public members list on /team. */
  hideFromPublic: boolean;
};

/** The columns behind Member, for `.select()`. */
export const MEMBER_COLUMNS =
  "id, email, name, iub_id, department, semester, residence_area, contact_number, facebook_link, blood_group, notes, payment_method, bkash_transaction_id, bkash_sender_number, executive_id, fields_of_interest, co_curricular, created_at, status, approved_at, approved_by, review_note, member_no, secondary_email, photo_url, bio, linkedin, github, skills, show_in_directory, hide_from_public";

export type MemberRow = {
  id: string;
  email: string | null;
  name: string | null;
  iub_id: string | null;
  department: string | null;
  semester: string | null;
  residence_area: string | null;
  contact_number: string | null;
  facebook_link: string | null;
  blood_group: string | null;
  notes: string | null;
  payment_method: string | null;
  bkash_transaction_id: string | null;
  bkash_sender_number: string | null;
  executive_id: string | null;
  fields_of_interest: string[] | null;
  co_curricular: string[] | null;
  created_at: string;
  status: MemberStatus;
  approved_at: string | null;
  approved_by: string | null;
  review_note: string | null;
  member_no: string | null;
  secondary_email: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  skills: string[] | null;
  show_in_directory: boolean;
  hide_from_public: boolean;
};

export function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    email: r.email ?? "",
    name: r.name ?? "",
    iubId: r.iub_id ?? "",
    department: r.department ?? "",
    semester: r.semester,
    residenceArea: r.residence_area ?? "",
    contactNumber: r.contact_number ?? "",
    facebookLink: r.facebook_link,
    bloodGroup: r.blood_group,
    notes: r.notes,
    paymentMethod: r.payment_method === "Bkash" || r.payment_method === "Cash" ? r.payment_method : null,
    bkashTransactionId: r.bkash_transaction_id,
    bkashSenderNumber: r.bkash_sender_number,
    executiveId: r.executive_id,
    interests: r.fields_of_interest ?? [],
    coCurricular: r.co_curricular ?? [],
    createdAt: r.created_at,
    status: r.status,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    reviewNote: r.review_note,
    memberNo: r.member_no,
    secondaryEmail: r.secondary_email,
    photoUrl: r.photo_url,
    bio: r.bio,
    linkedin: r.linkedin,
    github: r.github,
    skills: r.skills ?? [],
    showInDirectory: r.show_in_directory,
    hideFromPublic: r.hide_from_public ?? false,
  };
}

/** A card in the members-only directory (public fields only). */
export type DirectoryEntry = {
  id: string;
  name: string;
  department: string;
  intake: string | null;
  photoUrl: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  coCurricular: string[];
  linkedin: string | null;
  github: string | null;
};

/** The fields a member fills in (registration and profile), keyed as the database expects. */
export type ProfileFields = {
  name: string;
  department: string;
  semester?: string;
  residence_area: string;
  contact_number: string;
  facebook_link: string;
  blood_group: string;
  notes?: string;
  fields_of_interest: string[];
  co_curricular: string[];
  secondary_email: string;
  photo_url: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  skills?: string[];
  show_in_directory?: boolean;
  hide_from_public?: boolean;
  payment_method?: string;
  bkash_transaction_id?: string;
  bkash_sender_number?: string;
  executive_id?: string;
};
