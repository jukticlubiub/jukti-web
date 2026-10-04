import { readingMinutes } from "@/lib/logs/text";
import type { JuktiLog } from "@/lib/logs/types";

/**
 * SAMPLE logs, shown only until Supabase is connected. After that, logs come from the
 * `logs` table and this file is ignored. The posts are placeholders for reviewing the
 * design (the advice in them is general, and they're credited to club teams rather
 * than real people).
 */
type SampleLog = Omit<JuktiLog, "id" | "readingMinutes" | "number" | "updatedAt" | "author"> & {
  author: string;
  role?: string;
};

const samples: SampleLog[] = [
  {
    slug: "code-sprint-2026-is-live",
    title: "Code Sprint 2026 is live",
    excerpt: "The online round is open for a week. Here's how it works, and how to make the most of it.",
    category: "news",
    cover: null,
    author: "JUKTI Events Team",
    publishedAt: "2026-09-26T10:00:00+06:00",
    body: `The online round of **Code Sprint 2026** opened this morning, and it runs until Saturday, 3 October at 11:59 PM. The top 40 on the leaderboard go through to the on-campus final.

## How the round works

- Solve at your own pace, any time during the week.
- Problems range from warm-ups to properly hard ones, so everyone has something to chase.
- Ties on the number of problems solved are broken by total time.

## Before you start

Read every problem once before diving into the first one. The easiest problem isn't always the first, and five minutes of reading can save an hour of being stuck.

> New to contests? Our [competitive programming starter kit](/logs/competitive-programming-starter-kit) covers the template, the constraints table and the two techniques you'll use most.

RSVP on the [event page](/events/code-sprint-2026) to get the contest link and the final's details. Good luck!`,
  },
  {
    slug: "orientation-autumn-2026-recap",
    title: "Orientation, Autumn 2026: welcome to the JUKTIverse",
    excerpt: "A full auditorium, a new batch, and a year of plans. A look back at our first event of the semester.",
    category: "recap",
    cover: null,
    author: "JUKTI Editorial",
    publishedAt: "2026-09-15T18:00:00+06:00",
    body: `Our first event of the semester filled the auditorium. Thank you to every new CSE student who came to say hello.

## What we covered

The panel introduced what JUKTI does through the year: workshops for people starting out, contests and hackathons for people who want to test themselves, and seminars that bring alumni back to share what they've learned since.

## What's next

The calendar for the semester is already up on [Our Events](/events). A few highlights:

1. **Code Sprint 2026**, our programming contest, starting with a week-long online round.
2. **Intro to Competitive Programming**, a hands-on workshop for complete beginners.
3. **Hack the JUKTIverse**, our overnight hackathon in October.

Photos from the day are in the [event gallery](/events/orientation-autumn-2026#gallery). If you haven't joined the club yet, [now's the time](/join).`,
  },
  {
    slug: "competitive-programming-starter-kit",
    title: "A starter kit for competitive programming in C++",
    excerpt:
      "The template, the constraints table and the two techniques that solve a surprising number of problems. Everything we wish we'd known on day one.",
    category: "tutorial",
    cover: null,
    author: "JUKTI Tech Team",
    publishedAt: "2026-09-02T12:00:00+06:00",
    body: `Competitive programming rewards two things: knowing a small set of techniques well, and reading problems carefully. This guide gets you set up with both.

## Set up a template

Most solutions start the same way, so keep a template you can paste in:

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        // solve one test case
    }
    return 0;
}
\`\`\`

The two lines after \`main\` make \`cin\` and \`cout\` much faster. Without them, reading a million numbers can take longer than the time limit on its own. Once you use them, don't mix \`scanf\`/\`printf\` with \`cin\`/\`cout\` in the same program.

## Read the constraints first

The input limits tell you how fast your solution needs to be before you write a single line. As a rough guide, assume about 10^8 simple operations per second:

| n up to | Aim for |
| --- | --- |
| 10 | O(n!) |
| 20 | O(2^n · n) |
| 500 | O(n^3) |
| 5,000 | O(n^2) |
| 10^6 | O(n log n) |
| 10^8 | O(n) |

If n can be 200,000 and your idea is two nested loops, it's time to find a better idea.

## Prefix sums

Many problems ask for the sum of a range, again and again. Adding it up each time is O(n) per question. Instead, build the running totals once:

\`\`\`cpp
vector<long long> prefix(n + 1, 0);
for (int i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + a[i];
}

// Sum of a[l..r], inclusive, in O(1)
long long rangeSum = prefix[r + 1] - prefix[l];
\`\`\`

### Watch out for overflow

An \`int\` holds values up to about 2.1 × 10^9. Add up 200,000 numbers of size 10^9 and you're far past that, so use \`long long\` for sums and products. Overflow doesn't crash; it quietly gives a wrong answer.

## Binary search on the answer

When a problem asks for the smallest (or largest) value that satisfies a condition, and the condition only switches from false to true once, you can binary search for it:

\`\`\`cpp
// Smallest x in [lo, hi] for which ok(x) is true.
// Assumes ok(x) is false, false, ..., true, true.
long long lo = 0, hi = 2e18;
while (lo < hi) {
    long long mid = lo + (hi - lo) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid + 1;
}
// lo is the answer
\`\`\`

Writing \`lo + (hi - lo) / 2\` instead of \`(lo + hi) / 2\` avoids overflow when the bounds are large.

## Practice with purpose

- **Upsolve.** After a contest, solve the problems you couldn't. That's where most of the learning happens.
- **Read editorials, then close them.** Understand the idea, then write the solution yourself from memory.
- **Keep a log.** Write down every new trick you meet. It becomes your own reference.

> Want to practice with people? Join us at [Intro to Competitive Programming](/events/intro-to-competitive-programming), where we solve problems together from scratch.`,
  },
  {
    slug: "git-workflow-for-course-projects",
    title: "A Git workflow for group course projects",
    excerpt: "Branches, pull requests and a few habits that keep a four-person project from turning into a merge-conflict marathon.",
    category: "tutorial",
    cover: null,
    author: "JUKTI Tech Team",
    publishedAt: "2026-08-10T12:00:00+06:00",
    body: `Group projects fail in Git for the same few reasons: everyone commits to \`main\`, nobody pulls before pushing, and the night before the deadline turns into untangling conflicts. A simple routine avoids all of it.

## One branch per task

Start every piece of work on its own branch:

\`\`\`bash
git switch main
git pull
git switch -c feature/login-page
\`\`\`

Name branches after what they do, not who's doing them. \`feature/login-page\` tells the team something; \`rahim-branch\` doesn't.

## Commit small, commit often

A commit should be one logical change you can describe in a sentence:

\`\`\`bash
git add src/login
git commit -m "Add login form with email validation"
\`\`\`

Small commits are easy to review, easy to undo, and they make conflicts smaller when they happen.

## Stay up to date with main

Before you open a pull request, bring in what your teammates have merged:

\`\`\`bash
git fetch origin
git rebase origin/main
\`\`\`

If there's a conflict, Git stops and shows you the files. Fix them, then:

\`\`\`bash
git add .
git rebase --continue
\`\`\`

## Merge through pull requests

Push your branch and open a pull request on GitHub:

\`\`\`bash
git push -u origin feature/login-page
\`\`\`

Ask one teammate to read it before merging. It takes ten minutes and catches the bugs that would otherwise cost you an evening.

## Keep secrets out of the repo

Add a \`.gitignore\` on day one:

\`\`\`text
node_modules/
.env
*.log
\`\`\`

Passwords and API keys pushed to GitHub stay in the history even after you delete the file. If it happens, change the key immediately.`,
  },
  {
    slug: "landing-your-first-internship",
    title: "Landing your first internship as a CSE student",
    excerpt: "A one-page CV, two projects you can talk about, and a plan for the interview. What actually moves the needle.",
    category: "career",
    cover: null,
    author: "JUKTI Editorial",
    publishedAt: "2026-07-18T12:00:00+06:00",
    body: `Your first internship is the hardest one to get, because you don't have an internship on your CV yet. The good news: recruiters hiring interns know that, and they look for other signals.

## A CV that fits on one page

- Put **projects** above coursework. What you built says more than what you studied.
- For each project, one line on what it does and one on what *you* did.
- Link your GitHub, and make sure the pinned repositories have a README.

## Two projects you can talk about for twenty minutes

Depth beats breadth. Pick two projects and know them inside out: why you chose the design, what broke, what you'd change. Interviewers will dig, and "I followed a tutorial" ends the conversation quickly.

## Prepare for the technical round

Most intern interviews include a data structures and algorithms problem. You don't need to be a contest champion, but you should be comfortable with arrays, hash maps, sorting, and basic recursion, and you should **think out loud**.

> The interviewer is judging how you approach a problem as much as whether you finish it. Silence is the one thing they can't grade.

## Apply widely, follow up politely

Apply to more places than feels necessary, and keep a simple spreadsheet of where you applied and when. If you haven't heard back in two weeks, a short, polite follow-up email is fine.

Our alumni have been through all of this. Come to the next careers seminar on [Our Events](/events) and ask them directly.`,
  },
  {
    slug: "your-first-research-paper",
    title: "Writing your first research paper as an undergraduate",
    excerpt: "From a vague interest to a submitted paper: finding a question, reading efficiently, and structuring what you found.",
    category: "research",
    cover: null,
    author: "JUKTI Editorial",
    publishedAt: "2026-06-05T12:00:00+06:00",
    body: `Research as an undergraduate sounds intimidating, but most first papers follow the same path. Here's the map.

## Start with a question, not a topic

"Machine learning in healthcare" is a topic. "Can a small model detect pneumonia from chest X-rays as well as a large one?" is a question. A question tells you what to read, what to build, and when you're done.

## Read papers in three passes

1. **First pass (10 minutes):** title, abstract, figures, conclusion. Is it relevant?
2. **Second pass (an hour):** the whole paper, skipping proofs and details. What did they do, and how?
3. **Third pass (as long as it takes):** only for the few papers your work builds on. Could you reproduce it?

Keep notes for every paper you read. You'll need them for the related work section, and you won't remember them in three months.

## Structure what you found

Most papers in computer science follow the same outline:

| Section | Answers |
| --- | --- |
| Introduction | What's the problem, and why does it matter? |
| Related work | What have others done, and what's missing? |
| Method | What did you do? |
| Results | What happened? |
| Discussion | What does it mean, and what are the limits? |

Write the method and results first, while they're fresh. The introduction is easier once you know exactly what you're introducing.

## Get feedback early

Show a rough draft to your supervisor long before the deadline. A structural problem found in week two is a small fix; found the night before submission, it's a rewrite.`,
  },
  {
    slug: "what-24-hours-taught-us",
    title: "What 24 hours of hacking taught us",
    excerpt: "Scope small, demo early, and sleep a little. Lessons from the teams at our 2025 hackathon.",
    category: "story",
    cover: null,
    author: "JUKTI Events Team",
    publishedAt: "2025-11-28T12:00:00+06:00",
    body: `Our 2025 hackathon ended with a room full of tired people and a stack of demos that genuinely worked. Talking to the teams afterwards, the same lessons came up again and again.

## Cut the idea in half, then in half again

Every team that finished had cut their idea down, hard. The ones who didn't spent the last hour wiring together features that never quite connected. A small thing that works beats a big thing that almost works.

## Build the demo path first

Decide what the judges will see in three minutes, and build exactly that first. Everything else is a bonus.

## Someone should sleep

Teams that took turns napping made better decisions at 4 AM than teams that powered through. Tired people write bugs.

## Talk to the mentors

The mentors were there all night to help. The teams that asked early got unstuck in minutes instead of hours.

---

This year's hackathon, Hack the JUKTIverse 2026, is coming up in October. See the details on the [event page](/events/hack-the-juktiverse-2026).`,
  },
  {
    slug: "welcome-to-jukti-logs",
    title: "Welcome to Jukti Logs",
    excerpt: "Tutorials, event recaps, career advice and stories from the club, written by the people in it.",
    category: "news",
    cover: null,
    author: "JUKTI Editorial",
    publishedAt: "2025-10-01T12:00:00+06:00",
    body: `Jukti Logs is where the club writes things down: what we learn, what we build, and what happens at our events.

## What you'll find here

- **Tutorials** from workshops, written up so you can follow along at your own pace.
- **Recaps** of our events, with photos.
- **Career and research** advice from members and alumni.
- **Stories** from contests, hackathons and everything in between.

## Want to write?

If you've learned something worth sharing, we'd love to publish it. Talk to the editorial team at any club event.`,
  },
];

// Oldest first gets LOG 001.
const numbered = [...samples].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));

export const sampleLogs: JuktiLog[] = samples.map(({ author, role, ...log }) => ({
  ...log,
  id: log.slug,
  author: { name: author, role: role ?? null, avatarUrl: null },
  updatedAt: log.publishedAt,
  readingMinutes: readingMinutes(log.body),
  number: numbered.findIndex((s) => s.slug === log.slug) + 1,
}));
