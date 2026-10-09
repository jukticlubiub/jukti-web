import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { FacultyDirectory } from "@/components/helpline/FacultyDirectory";
import { HelplineHeader } from "@/components/helpline/HelplineHeader";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { getFaculty } from "@/lib/helpline/queries";

export const metadata: Metadata = pageMetadata({
  title: "Faculty Directory",
  description:
    "Room numbers and email addresses of the CSE faculty at Independent University, Bangladesh.",
  path: "/helpline/faculty",
});

export default async function FacultyPage() {
  const faculty = await getFaculty();

  return (
    <div className="relative overflow-x-clip pb-[clamp(5rem,9vw,10rem)]">
      <PageBackdrop />
      <HelplineHeader title="CSE" accent="FACULTY" subtitle="Find your faculty’s room and email" active="/helpline/faculty" />

      <div className="relative mx-auto max-w-[92rem] px-5 pt-[clamp(3.5rem,6vw,7rem)] lg:px-[clamp(2rem,4vw,5rem)]">
        <FacultyDirectory faculty={faculty} />
        <p className="mt-12 max-w-3xl text-[0.92rem] leading-relaxed text-muted">
          From the{" "}
          <a
            href="https://iub.ac.bd/directory/cse?type=departments"
            target="_blank"
            rel="noreferrer"
            className="text-body underline-offset-4 hover:text-flare hover:underline"
          >
            IUB CSE faculty directory
          </a>
          . Something out of date?{" "}
          <Link href="/contact" className="text-body underline-offset-4 hover:text-flare hover:underline">
            Let us know
          </Link>
          . Have a question for them? Ask it on the{" "}
          <Link href="/helpline" className="text-body underline-offset-4 hover:text-flare hover:underline">
            helpline
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
