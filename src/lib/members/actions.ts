"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, failed, fieldErrors, ok } from "@/lib/admin/form";
import { createSessionClient } from "@/lib/supabase/server";
import { getAccount, memberMode, readPreviewMember, writePreviewMember } from "./account";
import { type MemberStatus, memberStatuses } from "./options";
import { MEMBERS_TAG } from "./public";
import { currentSemester } from "./semester";
import type { Member, ProfileFields } from "./types";

const phone = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a Bangladeshi mobile number, e.g. 01712345678."));

const optionalUrl = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .max(300, "That link is too long.")
    .refine((v) => v === "" || pattern.test(v), message);

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  department: z.string().trim().min(1, "Enter your department.").max(80, "That's too long."),
  residence_area: z.string().trim().min(1, "Enter where you live (area).").max(120, "That's too long."),
  contact_number: phone,
  facebook_link: optionalUrl(/^https:\/\/([a-z0-9-]+\.)?(facebook\.com|fb\.com)\//i, "Paste your Facebook profile link (https://facebook.com/…)."),
  blood_group: z.string().trim().max(3),
  secondary_email: z
    .email("Enter a personal email address.")
    .trim()
    .toLowerCase()
    .refine((v) => !v.endsWith("@iub.edu.bd"), "Use a personal address, not your IUB one: you'll lose IUB email after graduation."),
  photo_url: z.string().trim().max(500),
  fields_of_interest: z.array(z.string().trim().min(1).max(80)).max(12),
  co_curricular: z.array(z.string().trim().min(1).max(80)).max(12),
});

const extrasSchema = z.object({
  bio: z.string().trim().max(500, "Keep your bio under 500 characters."),
  linkedin: optionalUrl(/^https:\/\/([a-z]+\.)?linkedin\.com\//i, "Paste your LinkedIn profile link (https://linkedin.com/in/…)."),
  github: optionalUrl(/^https:\/\/(www\.)?github\.com\//i, "Paste your GitHub link (https://github.com/…)."),
  skills: z.array(z.string().trim().min(1).max(40, "Keep each skill short.")).max(15, "Up to 15 skills."),
  show_in_directory: z.boolean(),
  hide_from_public: z.boolean(),
});

const paymentSchema = z
  .object({
    payment_method: z.enum(["Bkash", "Cash"], "Choose how you paid."),
    bkash_sender_number: z.string().transform((v) => v.replace(/[\s-]/g, "")),
    bkash_transaction_id: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || /^[A-Z0-9]{8,12}$/.test(v), "A bKash transaction ID is 8–12 letters and numbers."),
    executive_id: z.string().trim().min(1, "Enter the code an executive gave you after you paid.").max(40),
  })
  .superRefine((v, ctx) => {
    if (v.payment_method === "Bkash" && !/^(\+?88)?01[3-9]\d{8}$/.test(v.bkash_sender_number)) {
      ctx.addIssue({ code: "custom", path: ["bkash_sender_number"], message: "Enter the bKash number you paid from." });
    }
  });

/** Checked boxes plus the "Other" text box. */
function choices(fd: FormData, key: string) {
  const picked = fd.getAll(key).map(String);
  const other = String(fd.get(`${key}_other`) ?? "").trim();
  return [...new Set([...picked, ...(other ? [other] : [])])];
}

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

function readProfile(fd: FormData) {
  return {
    name: text(fd, "name"),
    department: text(fd, "department"),
    residence_area: text(fd, "residence_area"),
    contact_number: text(fd, "contact_number"),
    facebook_link: text(fd, "facebook_link"),
    blood_group: text(fd, "blood_group"),
    secondary_email: text(fd, "secondary_email"),
    photo_url: text(fd, "photo_url"),
    fields_of_interest: choices(fd, "fields_of_interest"),
    co_curricular: choices(fd, "co_curricular"),
  };
}

function readPayment(fd: FormData) {
  return {
    payment_method: text(fd, "payment_method"),
    bkash_sender_number: text(fd, "bkash_sender_number"),
    bkash_transaction_id: text(fd, "bkash_transaction_id"),
    executive_id: text(fd, "executive_id"),
  };
}

/** What the database's error codes mean, and which field they belong to. */
const dbErrors: Record<string, [field: string, message: string]> = {
  not_authenticated: ["form", "Your sign-in has expired. Sign in again."],
  not_iub_student: ["form", "Only IUB student accounts (your 7-digit ID @iub.edu.bd) can register."],
  already_registered: ["form", "You're already registered."],
  not_registered: ["form", "You haven't registered yet."],
  invalid_name: ["name", "Enter your full name."],
  invalid_department: ["department", "Enter your department."],
  invalid_residence: ["residence_area", "Enter where you live (area)."],
  invalid_phone: ["contact_number", "Enter a Bangladeshi mobile number."],
  invalid_facebook: ["facebook_link", "Paste your Facebook profile link."],
  invalid_blood_group: ["blood_group", "Choose a blood group."],
  invalid_secondary_email: ["secondary_email", "Enter a personal email address."],
  secondary_email_is_iub: ["secondary_email", "Use a personal address, not your IUB one."],
  invalid_photo: ["photo_url", "That photo couldn't be used. Upload it again."],
  too_many_choices: ["form", "Choose up to 12 in each list."],
  invalid_payment: ["bkash_sender_number", "Check the payment details."],
  executive_required: ["executive_id", "Enter the code an executive gave you after you paid."],
  invalid_executive: ["executive_id", "That code isn't valid. Check it with the executive you paid."],
  invalid_bio: ["bio", "Keep your bio under 500 characters."],
  invalid_link: ["linkedin", "Check your LinkedIn and GitHub links."],
  too_many_skills: ["skills", "Up to 15 short skills."],
};

function fromDb(message: string): ActionState {
  const code = Object.keys(dbErrors).find((c) => message.includes(c));
  if (!code) return failed("Something went wrong. Please try again.");
  const [field, text] = dbErrors[code];
  return failed(text, field === "form" ? undefined : { [field]: text });
}

const CHECK_FORM = "Some details need fixing. Check the highlighted fields.";

/** Registering on /join. Signed in with an IUB student account, and not registered yet. */
export async function registerMember(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const profile = profileSchema.safeParse(readProfile(fd));
  const payment = paymentSchema.safeParse(readPayment(fd));
  if (!profile.success || !payment.success) {
    return failed(CHECK_FORM, { ...(profile.success ? {} : fieldErrors(profile.error)), ...(payment.success ? {} : fieldErrors(payment.error)) });
  }

  const account = await getAccount();
  if (!account.user) return failed("Your sign-in has expired. Sign in again.");
  if (!account.user.iubId) return failed(dbErrors.not_iub_student[1]);
  if (account.member) redirect("/account");

  const fields: ProfileFields = {
    ...profile.data,
    ...payment.data,
    semester: currentSemester(account.user.iubId, new Date()),
    notes: text(fd, "notes").trim().slice(0, 1000),
  };

  if (account.mode === "preview") {
    await writePreviewMember(previewMember(account.user.email, account.user.iubId, fields));
    redirect("/account?joined=1");
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("register_member", { p: fields });
  if (error) return fromDb(error.message);
  redirect("/account?joined=1");
}

/** Saving /account. A rejected member may also correct their payment details. */
export async function updateProfile(previous: ActionState, fd: FormData): Promise<ActionState> {
  const profile = profileSchema.safeParse(readProfile(fd));
  const extras = extrasSchema.safeParse({
    bio: text(fd, "bio"),
    linkedin: text(fd, "linkedin"),
    github: text(fd, "github"),
    skills: text(fd, "skills").split(",").map((s) => s.trim()).filter(Boolean),
    show_in_directory: fd.get("show_in_directory") === "on",
    hide_from_public: fd.get("hide_from_public") === "on",
  });
  const resubmitting = fd.has("payment_method");
  const payment = resubmitting ? paymentSchema.safeParse(readPayment(fd)) : null;
  if (!profile.success || !extras.success || (payment && !payment.success)) {
    return failed(CHECK_FORM, {
      ...(profile.success ? {} : fieldErrors(profile.error)),
      ...(extras.success ? {} : fieldErrors(extras.error)),
      ...(payment && !payment.success ? fieldErrors(payment.error) : {}),
    });
  }
  const fields: ProfileFields = { ...profile.data, ...extras.data, ...(payment?.success ? payment.data : {}) };

  if (memberMode() === "preview") {
    const current = await readPreviewMember();
    if (!current) return failed("You haven't registered yet.");
    await writePreviewMember({ ...previewMember(current.email, current.iubId, fields), ...keep(current, resubmitting) });
    refresh();
    return ok(previous, resubmitting ? "Sent for review again." : "Profile saved.");
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("update_my_profile", { p: fields });
  if (error) return fromDb(error.message);
  updateTag(MEMBERS_TAG);
  refresh();
  return ok(previous, data === "pending" && resubmitting ? "Sent for review again." : "Profile saved.");
}

/** Development only: switch the pretend member's status, to see each version of the pages. */
export async function setPreviewStatus(fd: FormData) {
  if (memberMode() !== "preview") return;
  const current = await readPreviewMember();
  const status = String(fd.get("status")) as MemberStatus;
  if (!current || !memberStatuses.includes(status)) return;
  await writePreviewMember({
    ...current,
    status,
    memberNo: status === "approved" ? (current.memberNo ?? "JKT-26-0127") : current.memberNo,
    approvedAt: status === "approved" ? new Date().toISOString() : current.approvedAt,
    reviewNote: status === "rejected" ? "We couldn't find this bKash payment. Check the sender number." : current.reviewNote,
  });
  refresh();
}

/** Development only: forget the pretend registration. */
export async function resetPreview() {
  if (memberMode() !== "preview") return;
  await writePreviewMember(null);
  redirect("/join");
}

function previewMember(email: string, iubId: string | null, f: ProfileFields): Member {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email,
    name: f.name,
    iubId: iubId ?? "",
    department: f.department,
    semester: f.semester ?? null,
    residenceArea: f.residence_area,
    contactNumber: f.contact_number,
    facebookLink: f.facebook_link || null,
    bloodGroup: f.blood_group || null,
    notes: f.notes || null,
    paymentMethod: f.payment_method === "Bkash" || f.payment_method === "Cash" ? f.payment_method : null,
    bkashTransactionId: f.bkash_transaction_id || null,
    bkashSenderNumber: f.bkash_sender_number || null,
    executiveId: f.executive_id || null,
    interests: f.fields_of_interest,
    coCurricular: f.co_curricular,
    createdAt: new Date().toISOString(),
    status: "pending",
    approvedAt: null,
    approvedBy: null,
    reviewNote: null,
    memberNo: null,
    secondaryEmail: f.secondary_email,
    // Photos aren't uploaded in preview (no storage).
    photoUrl: null,
    bio: f.bio || null,
    linkedin: f.linkedin || null,
    github: f.github || null,
    skills: f.skills ?? [],
    showInDirectory: f.show_in_directory ?? false,
    hideFromPublic: f.hide_from_public ?? false,
  };
}

/** What a profile edit doesn't change (in preview). */
function keep(m: Member, resubmitting: boolean): Partial<Member> {
  const base: Partial<Member> = { createdAt: m.createdAt, semester: m.semester, notes: m.notes, status: m.status, approvedAt: m.approvedAt, reviewNote: m.reviewNote, memberNo: m.memberNo };
  if (resubmitting && m.status === "rejected") return { ...base, status: "pending" };
  return { ...base, paymentMethod: m.paymentMethod, bkashTransactionId: m.bkashTransactionId, bkashSenderNumber: m.bkashSenderNumber, executiveId: m.executiveId };
}
