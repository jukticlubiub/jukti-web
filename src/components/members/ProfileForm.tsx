"use client";

import { Counter, Field, inputClass } from "@/components/helpline/fields";
import { cn } from "@/lib/cn";
import { updateProfile } from "@/lib/members/actions";
import { coCurricularOptions, interestOptions } from "@/lib/members/options";
import type { Member } from "@/lib/members/types";
import { useState } from "react";
import { AvatarField } from "./AvatarField";
import { BloodGroupSelect, Choices, FormMessage, MemberForm, PaymentFields, Section, TextInput } from "./MemberFields";

/** /account: everything a member can change about themselves. */
export function ProfileForm({ member, live }: { member: Member; live: boolean }) {
  const [bio, setBio] = useState(member.bio ?? "");
  const rejected = member.status === "rejected";

  return (
    <MemberForm action={updateProfile} className="grid gap-9">
      {(state, pending) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            {rejected && (
              <Section title="Fix your registration" hint="Correct your payment details below and save. We’ll check again.">
                <PaymentFields
                  iubId={member.iubId}
                  errors={e}
                  defaults={{ method: member.paymentMethod, sender: member.bkashSenderNumber, txn: member.bkashTransactionId }}
                />
              </Section>
            )}

            <Section title="About you">
              <TextInput label="Full name" name="name" autoComplete="name" defaultValue={member.name} error={e.name} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Department" name="department" defaultValue={member.department} error={e.department} />
                <TextInput label="Where you live" name="residence_area" defaultValue={member.residenceArea} error={e.residence_area} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Mobile number" name="contact_number" type="tel" inputMode="tel" autoComplete="tel" defaultValue={member.contactNumber} error={e.contact_number} />
                <BloodGroupSelect defaultValue={member.bloodGroup} error={e.blood_group} />
              </div>
              <TextInput label="Personal email" name="secondary_email" type="email" autoComplete="email" defaultValue={member.secondaryEmail} error={e.secondary_email} hint={<span className="text-[0.75rem] text-muted">Not your IUB email</span>} />
              <AvatarField userId={member.id} name={member.name} defaultUrl={member.photoUrl} live={live} error={e.photo_url} />
            </Section>

            <Section title="Your profile" hint="Shown in the members directory if you choose to appear there.">
              <Field label="Bio" hint={<Counter length={bio.length} max={500} />} error={e.bio}>
                {(control) => (
                  <textarea
                    {...control}
                    name="bio"
                    rows={3}
                    maxLength={500}
                    value={bio}
                    onChange={(ev) => setBio(ev.target.value)}
                    placeholder="A line or two about you: what you build, what you’re learning."
                    className={cn(inputClass, "resize-y py-3")}
                  />
                )}
              </Field>
              <TextInput label="Skills" name="skills" placeholder="React, Python, UI design" defaultValue={member.skills.join(", ")} error={e.skills} hint={<span className="text-[0.75rem] text-muted">Separate with commas</span>} />
              <div className="grid gap-5 sm:grid-cols-3">
                <TextInput label="LinkedIn" name="linkedin" type="url" placeholder="https://linkedin.com/in/…" defaultValue={member.linkedin} error={e.linkedin} />
                <TextInput label="GitHub" name="github" type="url" placeholder="https://github.com/…" defaultValue={member.github} error={e.github} />
                <TextInput label="Facebook" name="facebook_link" type="url" placeholder="https://facebook.com/…" defaultValue={member.facebookLink} error={e.facebook_link} />
              </div>
              <Choices label="Fields of interest" name="fields_of_interest" options={interestOptions} defaultValues={member.interests} />
              <Choices label="Co-curricular" name="co_curricular" options={coCurricularOptions} defaultValues={member.coCurricular} />
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-glass-border bg-white/[0.03] p-4">
                <input type="checkbox" name="show_in_directory" defaultChecked={member.showInDirectory} className="mt-1 size-4 accent-[#f57c48]" />
                <span>
                  <span className="block text-fg">Show me in the members directory</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted">
                    Only signed-in members see it: your photo, name, department, intake, bio, skills, interests and LinkedIn/GitHub. Never your phone,
                    email or address.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-glass-border bg-white/[0.03] p-4">
                <input type="checkbox" name="hide_from_public" defaultChecked={member.hideFromPublic} className="mt-1 size-4 accent-[#f57c48]" />
                <span>
                  <span className="block text-fg">Hide me from the public members list</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted">
                    The Team Jukti page lists every member by name, department and intake (with your photo, if you’ve added one). Tick this to leave
                    yourself out.
                  </span>
                </span>
              </label>
            </Section>

            <div className="grid gap-4">
              <FormMessage state={state} />
              <div>
                <button type="submit" disabled={pending} className="btn-pill btn-primary disabled:opacity-60">
                  {pending ? "Saving…" : rejected ? "Save and send for review" : "Save profile"}
                </button>
              </div>
            </div>
          </>
        );
      }}
    </MemberForm>
  );
}
