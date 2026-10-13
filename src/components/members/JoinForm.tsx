"use client";

import { Field, inputClass } from "@/components/helpline/fields";
import { ArrowIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { registerMember } from "@/lib/members/actions";
import { coCurricularOptions, interestOptions } from "@/lib/members/options";
import { AvatarField } from "./AvatarField";
import { BloodGroupSelect, Choices, FormMessage, MemberForm, PaymentFields, Section, TextInput } from "./MemberFields";

/** /join, once signed in with an IUB student account: the registration form. */
export function JoinForm({
  userId,
  googleName,
  email,
  iubId,
  semester,
  intake,
  live,
  codeRequired,
}: {
  userId: string;
  googleName: string;
  email: string;
  iubId: string;
  semester: string;
  intake: string | null;
  live: boolean;
  /** Whether the executive's code is asked for (Admin > Members). */
  codeRequired: boolean;
}) {
  return (
    <MemberForm action={registerMember} className="grid gap-9">
      {(state, pending) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <Section title="About you">
              <TextInput label="Full name" name="name" autoComplete="name" defaultValue={googleName} error={e.name} />
              <div className="grid gap-5 sm:grid-cols-3">
                <TextInput label="IUB ID" name="iub_id_shown" readOnly defaultValue={iubId} tabIndex={-1} />
                <TextInput label="Semester" name="semester_shown" readOnly defaultValue={semester} tabIndex={-1} hint={intake ? <span className="text-[0.75rem] text-muted">Since {intake}</span> : undefined} />
                <TextInput label="Department" name="department" placeholder="e.g. CSE" defaultValue="CSE" error={e.department} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Mobile number" name="contact_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" error={e.contact_number} />
                <TextInput label="Where you live" name="residence_area" placeholder="Area, e.g. Bashundhara" autoComplete="address-level2" error={e.residence_area} />
              </div>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <TextInput
                  label="Facebook profile"
                  name="facebook_link"
                  type="url"
                  placeholder="https://facebook.com/…"
                  hint={<span className="text-[0.75rem] text-muted">Optional</span>}
                  error={e.facebook_link}
                />
                <BloodGroupSelect error={e.blood_group} />
              </div>
            </Section>

            <Section
              title="After you graduate"
              hint={
                <>
                  Your IUB email (<span className="text-fg">{email}</span>) stops working after graduation. Add a personal email so we can
                  keep in touch, and later connect it as a way to sign in.
                </>
              }
            >
              <TextInput label="Personal email" name="secondary_email" type="email" autoComplete="email" placeholder="you@gmail.com" error={e.secondary_email} />
              <AvatarField userId={userId} name={googleName} defaultUrl={null} live={live} error={e.photo_url} />
            </Section>

            <Section title="What you’re into" hint="Pick as many as you like. It helps us find you the right roles and teammates.">
              <Choices label="Fields of interest" name="fields_of_interest" options={interestOptions} />
              <Choices label="Co-curricular" hint="Activities you take part in or would like to join." name="co_curricular" options={coCurricularOptions} />
            </Section>

            <Section title="Registration fee">
              <PaymentFields iubId={iubId} errors={e} codeRequired={codeRequired} />
            </Section>

            <Section title="Anything else?">
              <Field label="Notes" hint={<span className="text-[0.75rem] text-muted">Optional</span>}>
                {(control) => <textarea {...control} name="notes" rows={3} maxLength={1000} className={cn(inputClass, "resize-y py-3")} />}
              </Field>
            </Section>

            <div className="grid gap-4">
              <FormMessage state={state} />
              <div className="flex flex-wrap items-center gap-4">
                <button type="submit" disabled={pending} className="btn-pill btn-primary disabled:opacity-60">
                  {pending ? "Sending…" : "Submit registration"}
                  {!pending && <ArrowIcon />}
                </button>
                <p className="text-[0.88rem] text-muted">An executive checks your payment, then you’re a member.</p>
              </div>
            </div>
          </>
        );
      }}
    </MemberForm>
  );
}
