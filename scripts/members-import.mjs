// Loads members from the Jukti Reg app into the website.
//
// 1. In the registration app's admin dashboard, download the members CSV (one per term
//    is fine; pass them all).
// 2. node scripts/members-import.mjs ~/Downloads/jukti-registrations_*.csv
// 3. Paste supabase/seed/members-import.sql into the website project's SQL editor.
//
// Each person is matched to their account the first time they sign in with their IUB
// email, already approved and numbered (in registration order). Running it again only
// adds people who aren't there yet. The SQL holds personal details (phone numbers,
// payments): it's git-ignored, so don't commit or share it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/members-import.mjs <members.csv> [more.csv …]");
  process.exit(1);
}

/** RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** The export puts ' before cells starting with = + - @ (so Excel doesn't run them). */
const unguard = (v) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v).trim();

const COLUMNS = {
  name: "Name",
  email: "Email",
  iub_id: "IUB ID",
  department: "Department",
  semester: "Semester",
  contact_number: "Contact Number",
  facebook_link: "Facebook Link",
  residence_area: "Residence Area",
  blood_group: "Blood Group",
  fields_of_interest: "Fields of Expertise",
  co_curricular: "Co-Curricular",
  payment_method: "Payment Method",
  bkash_sender_number: "Bkash Sender Number",
  bkash_transaction_id: "Bkash Transaction ID",
  executive: "Executive",
  notes: "Notes",
  created_at: "Created At (UTC)",
};

const people = new Map();
for (const file of files) {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  // The dashboard's CSV has readable headers ("Name"); a raw export of the Supabase
  // table (members_rows.csv) has the column names, with the executive's code.
  const raw = header.includes("email") && header.includes("name");
  const at = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, label]) => [key, header.indexOf(raw ? (key === "executive" ? "executive_id" : key) : label)]),
  );
  if (at.email < 0 || at.name < 0) {
    console.error(`${file}: doesn't look like the registration app's export (no Name/Email columns).`);
    process.exit(1);
  }
  for (const r of rows) {
    const get = (key) => (at[key] >= 0 ? unguard(r[at[key]] ?? "") : "");
    const email = get("email").toLowerCase();
    if (!email.includes("@")) continue;
    const registered = Date.parse(get("created_at"));
    const person = {
      ...Object.fromEntries(Object.keys(COLUMNS).map((k) => [k, get(k)])),
      email,
      registered_at: Number.isNaN(registered) ? new Date().toISOString() : new Date(registered).toISOString(),
    };
    // The same person in two exports: keep their first registration.
    const seen = people.get(email);
    if (!seen || person.registered_at < seen.registered_at) people.set(email, person);
  }
}

const q = (v) => (v ? `'${String(v).replace(/'/g, "''")}'` : "null");
/** A list: "a; b" (dashboard CSV), ["a","b"] (JSON, raw export) or {a,b} (Postgres). */
function items(v) {
  const text = String(v || "").trim();
  if (text.startsWith("[")) {
    try {
      return JSON.parse(text).map(String);
    } catch {}
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    return [...text.slice(1, -1).matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)].map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, "$1"));
  }
  return text.split(";");
}

const list = (v) => {
  const values = items(v)
    .map((s) => s.trim())
    .filter(Boolean);
  return values.length ? `array[${values.map(q).join(", ")}]::text[]` : "'{}'::text[]";
};

const ordered = [...people.values()].sort((a, b) => a.registered_at.localeCompare(b.registered_at));
const values = ordered.map(
  (p) =>
    `  (${[
      q(p.email),
      q(p.name || p.email.split("@")[0]),
      q(p.iub_id),
      q(p.department),
      q(p.semester),
      q(p.residence_area),
      q(p.contact_number),
      q(p.facebook_link),
      q(p.blood_group),
      q(p.notes),
      q(p.payment_method),
      q(p.bkash_transaction_id),
      q(p.bkash_sender_number),
      q(p.executive),
      list(p.fields_of_interest),
      list(p.co_curricular),
      `${q(p.registered_at)}::timestamptz`,
    ].join(", ")})`,
);

const sql = `-- Generated by scripts/members-import.mjs from: ${files.map((f) => f.split("/").pop()).join(", ")}
-- ${ordered.length} people. Personal data: don't commit or share this file.
-- Safe to run again: only people not imported yet (and not already members) are added.

insert into public.member_imports (
  email, name, iub_id, department, semester, residence_area, contact_number, facebook_link, blood_group,
  notes, payment_method, bkash_transaction_id, bkash_sender_number, executive, fields_of_interest,
  co_curricular, registered_at
)
select v.*
from (values
${values.join(",\n")}
) as v (email, name, iub_id, department, semester, residence_area, contact_number, facebook_link, blood_group,
        notes, payment_method, bkash_transaction_id, bkash_sender_number, executive, fields_of_interest,
        co_curricular, registered_at)
where not exists (select 1 from public.member_imports i where i.email = v.email)
  and not exists (select 1 from public.members m where lower(m.email) = v.email)
order by v.registered_at;
`;

const out = fileURLToPath(new URL("../supabase/seed/members-import.sql", import.meta.url));
writeFileSync(out, sql);
console.log(`${ordered.length} members → supabase/seed/members-import.sql`);
