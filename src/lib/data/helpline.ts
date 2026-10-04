import type { HelplineAnswer, HelplineQuestion } from "@/lib/helpline/types";

/**
 * SAMPLE questions and answers, shown only until Supabase is connected. After that, the
 * board comes from the `helpline_questions` and `helpline_answers` tables and this file
 * is ignored. They're placeholders for reviewing the design: the answers are credited to
 * made-up helpers, not real seniors or faculty.
 */
type SampleQuestion = Omit<HelplineQuestion, "answerCount">;

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const sampleQuestions: SampleQuestion[] = [
  {
    id: id(1),
    title: "Why does my linked list lose nodes when I delete from the middle?",
    body: `I'm writing delete(int key) for a singly linked list in C++. Deleting the head works, but when I delete a node in the middle, every node after it disappears when I print the list.

What I do: walk with a pointer cur until cur->data == key, then delete cur.

Do I need to keep track of the previous node as well?`,
    topic: "course",
    course: "CSE 203",
    askerName: "Tahmid R.",
    createdAt: "2026-09-27T21:14:00+06:00",
  },
  {
    id: id(2),
    title: "How do I start a proof by induction when the base case isn't n = 1?",
    body: `Our discrete math exercise asks to prove 2^n > n^2 for all n ≥ 5. I understand induction when it starts at 1, but here I'm not sure what the base case should be, or whether the inductive step changes.

Also, is it fine to assume the statement for all values up to k (strong induction) instead of just k?`,
    topic: "math",
    course: "CSE 201",
    askerName: null,
    createdAt: "2026-09-26T16:40:00+06:00",
  },
  {
    id: id(3),
    title: "Round robin: how is waiting time counted when a process arrives mid-quantum?",
    body: `In round robin scheduling with a quantum of 4, P2 arrives at time 2 while P1 is running. Does P2 go into the ready queue before or after P1 when P1's quantum ends at time 4?

Our slides and a YouTube video give different Gantt charts, so the average waiting time comes out different.`,
    topic: "course",
    course: "CSE 309",
    askerName: "Nabila S.",
    createdAt: "2026-09-26T10:05:00+06:00",
  },
  {
    id: id(4),
    title: "My solution passes on my laptop but gets a runtime error on the judge",
    body: `On an online judge my C++ solution gets "Runtime Error" on test 7, but every test I try locally works. I declare int arr[1000000]; inside main().

Could that be the problem? What's the usual way to find the failing case when the judge doesn't show it?`,
    topic: "programming",
    course: null,
    askerName: "Arif H.",
    createdAt: "2026-09-24T23:30:00+06:00",
  },
  {
    id: id(5),
    title: "When should we start looking for a thesis supervisor?",
    body: `I'm in my third year and plan to do a thesis rather than a project. When do students usually approach faculty, and what should we bring to the first meeting? We don't have a topic yet, only a general interest in machine learning.`,
    topic: "projects",
    course: null,
    askerName: "Maliha K.",
    createdAt: "2026-09-22T12:20:00+06:00",
  },
  {
    id: id(6),
    title: "Is competitive programming worth it if I want to do web development?",
    body: `Everyone around me does Codeforces, but I enjoy building websites more. Will skipping CP hurt me in internship interviews, or is a good portfolio enough?`,
    topic: "career",
    course: null,
    askerName: "Sadia P.",
    createdAt: "2026-09-19T18:45:00+06:00",
  },
  {
    id: id(7),
    title: "Where can I find past mid-term questions for practice?",
    body: `Are old mid-term papers shared anywhere for CSE courses? I'd like to practise the kind of questions that come in exams, not only the textbook exercises.`,
    topic: "other",
    course: null,
    askerName: null,
    createdAt: "2026-09-16T14:10:00+06:00",
  },
];

export const sampleAnswers: HelplineAnswer[] = [
  {
    id: id(101),
    questionId: id(1),
    authorName: "JUKTI Mentors",
    authorRole: "senior",
    body: `Yes: the node before the one you delete still points to it. After delete cur, that pointer dangles, so printing stops (or crashes) there.

Walk with two pointers, prev and cur. When cur->data == key:

prev->next = cur->next;
delete cur;

Handle the head separately (when prev is still nullptr), and check for the key not being in the list at all.`,
    createdAt: "2026-09-27T22:02:00+06:00",
  },
  {
    id: id(102),
    questionId: id(2),
    authorName: "Sample Faculty Member",
    authorRole: "faculty",
    body: `The base case is the first value the claim is about, so here you check n = 5: 32 > 25.

The inductive step is the same idea: assume 2^k > k^2 for some k ≥ 5 and show 2^(k+1) > (k+1)^2. You'll need k ≥ 5 somewhere in that step (to show 2k^2 ≥ (k+1)^2), which is why the claim starts at 5.

Strong induction is always allowed. It isn't needed here, but it's a correct proof too.`,
    createdAt: "2026-09-27T09:30:00+06:00",
  },
  {
    id: id(103),
    questionId: id(4),
    authorName: "JUKTI Mentors",
    authorRole: "senior",
    body: `Very likely. A local array that big lives on the stack, and a million ints is about 4 MB, more than many judges allow for the stack. Declare it globally (outside main) or use a std::vector.

To find failing cases: write a brute-force solution, generate small random inputs, and compare the two outputs in a loop. It finds most bugs within a few seconds.`,
    createdAt: "2026-09-25T08:15:00+06:00",
  },
  {
    id: id(104),
    questionId: id(5),
    authorName: "Sample Faculty Member",
    authorRole: "faculty",
    body: `The semester before you register for thesis is a good time. Read a few recent papers from the faculty whose work interests you, and come with two or three questions or directions you'd like to explore. A clear interest matters more than a finished topic.`,
    createdAt: "2026-09-23T11:00:00+06:00",
  },
  {
    id: id(105),
    questionId: id(5),
    authorName: "JUKTI Mentors",
    authorRole: "senior",
    body: `Adding to that: bring your transcript and anything you've built, even a small ML project on Kaggle. It helps the conversation a lot.`,
    createdAt: "2026-09-23T19:40:00+06:00",
  },
  {
    id: id(106),
    questionId: id(6),
    authorName: "JUKTI Mentors",
    authorRole: "senior",
    body: `You don't need to be a CP star, but do practise data structures and algorithm problems: most interviews include one or two. A solid portfolio plus steady problem-solving practice (say, a few problems a week) is a great combination for web roles.`,
    createdAt: "2026-09-20T10:25:00+06:00",
  },
];
