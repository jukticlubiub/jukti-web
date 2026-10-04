import type { Faculty } from "@/lib/helpline/types";

/**
 * CSE faculty at IUB, from the university's public directory
 * (https://iub.ac.bd/directory/cse?type=departments), retrieved 28 Sep 2026 and to be
 * checked by the club. Used until Supabase is connected; the same list seeds the
 * `faculty` table (supabase/seed/faculty.sql, generated from this file by
 * scripts/faculty-seed.mjs). Only institutional addresses are listed.
 */
type Row = [name: string, designation: string, room: string | null, email: string];

const rows: Row[] = [
  ["A K M Mahbubur Rahman, PhD", "Associate Professor and Head", "BC 6011B", "akmmrahman@iub.edu.bd"],
  ["Amin Ahsan Ali, PhD", "Professor", "BC 6003", "aminali@iub.edu.bd"],
  ["Dr. Tarem Ahmed, SMIEEE", "Professor", "C 7011", "tarem@iub.edu.bd"],
  ["MM Mahbubul Syeed, PhD", "Professor", "C 7002", "mahbubul.syeed@iub.edu.bd"],
  ["Saadia Binte Alam, PhD", "Associate Professor", "C 7005", "saadiabinte@iub.edu.bd"],
  ["Mohammad Faisal Uddin, PhD", "Associate Professor", "BC 5001 F", "faisal@iub.edu.bd"],
  ["Razib Hayat Khan, PhD", "Associate Professor", "C 7007", "rkhan@iub.edu.bd"],
  ["Ashraful Islam, PhD", "Assistant Professor; Director, Center for Computational & Data Sciences", "MK 8004", "ashraful@iub.edu.bd"],
  ["Asif Mahmood, PhD", "Assistant Professor", "C 7004", "asif.mahmood@iub.edu.bd"],
  ["Farzana Rahman, PhD", "Assistant Professor", "C 7016", "farzana.rahman@iub.edu.bd"],
  ["Md Tarek Habib, PhD", "Associate Professor", "BC 5023A", "tarek@iub.edu.bd"],
  ["Md. Rashedur Rahman, D. Eng.", "Assistant Professor", "MK 8004A", "rashed@iub.edu.bd"],
  ["Dr. Raqibul Hasan", "Assistant Professor", "BC 6003A", "raqibul.hasan@iub.edu.bd"],
  ["Mohammad Shidujaman, PhD", "Assistant Professor", "C 7013", "shidujaman@iub.edu.bd"],
  ["Bijoy Rahman Arif", "Lecturer A", "BC 5010", "bijoyarif@iub.edu.bd"],
  ["Kaniz Fatema", "Lecturer A", "C 7003", "kaniz.fatema@iub.edu.bd"],
  ["Md Abu Sayed", "Lecturer A", "BC 5010", "asayed@iub.edu.bd"],
  ["Md Asif Bin Khaled", "Lecturer A", "BC 5010D", "mdasifbinkhaled@iub.edu.bd"],
  ["Md Fahad Monir", "Lecturer A", "BC 5010", "fahad.monir@iub.edu.bd"],
  ["Mohammad Motiur Rahman", "Lecturer A", "BC 5010", "motiur@iub.edu.bd"],
  ["Mohammad Noor Nabi", "Lecturer A", "BC 6005", "mnnabi@iub.edu.bd"],
  ["Ms. Romasa Qasim", "Lecturer A", null, "romasa.qasim@iub.edu.bd"],
  ["Sabrina Alam", "Lecturer A", "BC 5007", "sabrina.alam@iub.edu.bd"],
  ["Sanzar Adnan Alam", "Lecturer A", "BC 6005", "sanzar@iub.edu.bd"],
  ["Subrata Kumar Dey", "Lecturer A", "BC 6005C", "subrata@iub.edu.bd"],
  ["Azwad Abid", "Lecturer B", "BC 5023B", "azwadabid@iub.edu.bd"],
  ["Sajed Imtenanul Haque", "Lecturer B", "BC 6005B", "imtenanul@iub.edu.bd"],
  ["Israt Jahan Runa", "Lecturer B", "C 7008", "israt@iub.edu.bd"],
  ["Reefka Fabliha Tulona", "Lecturer B", "C 7008", "reefka@iub.edu.bd"],
];

export const sampleFaculty: Faculty[] = rows.map(([name, designation, room, email], position) => ({
  id: email,
  name,
  designation,
  room,
  email,
  photoUrl: null,
  position,
}));
