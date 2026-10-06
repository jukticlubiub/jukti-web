import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import type { MemberAccount } from "./account";
import { intakeLabel } from "./semester";
import type { DirectoryEntry } from "./types";

type Row = {
  id: string;
  name: string;
  department: string | null;
  intake: string | null;
  photo_url: string | null;
  bio: string | null;
  skills: string[] | null;
  fields_of_interest: string[] | null;
  co_curricular: string[] | null;
  linkedin: string | null;
  github: string | null;
};

/** Approved members who chose to appear, public fields only. Only approved members may call it. */
export async function getDirectory(account: MemberAccount): Promise<DirectoryEntry[]> {
  if (account.mode === "preview") return previewDirectory(account);
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("member_directory");
  if (error) throw new Error(`Couldn't load the directory: ${error.message}`);
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    department: r.department ?? "",
    intake: intakeLabel(r.intake),
    photoUrl: r.photo_url,
    bio: r.bio,
    skills: r.skills ?? [],
    interests: r.fields_of_interest ?? [],
    coCurricular: r.co_curricular ?? [],
    linkedin: r.linkedin,
    github: r.github,
  }));
}

/** Sample members for preview mode (made-up people), plus you if you opted in. */
function previewDirectory({ member }: MemberAccount): DirectoryEntry[] {
  const sample: DirectoryEntry[] = [
    { id: "s1", name: "Sample Member A", department: "CSE", intake: "Autumn 2023", photoUrl: null, bio: "Competitive programmer, mostly C++.", skills: ["C++", "Algorithms"], interests: ["Event Management"], coCurricular: ["Quiz & Olympiad", "Hackathon"], linkedin: null, github: "https://github.com/" },
    { id: "s2", name: "Sample Member B", department: "CSE", intake: "Spring 2024", photoUrl: null, bio: "I make the posters.", skills: ["Figma", "Illustrator"], interests: ["Graphic Design (Canva not accepted)", "Social Media Management"], coCurricular: ["App & Web Development"], linkedin: "https://www.linkedin.com/", github: null },
    { id: "s3", name: "Sample Member C", department: "CEN", intake: "Summer 2022", photoUrl: null, bio: null, skills: ["Robotics", "Arduino"], interests: ["Logistics & Operations"], coCurricular: ["Robotics", "AI & Machine Learning"], linkedin: null, github: null },
  ];
  if (member.showInDirectory) {
    sample.unshift({
      id: member.id,
      name: member.name,
      department: member.department,
      intake: intakeLabel(member.iubId),
      photoUrl: member.photoUrl,
      bio: member.bio,
      skills: member.skills,
      interests: member.interests,
      coCurricular: member.coCurricular,
      linkedin: member.linkedin,
      github: member.github,
    });
  }
  return sample;
}
