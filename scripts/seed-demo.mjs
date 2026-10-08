#!/usr/bin/env node
// =============================================================================
// Demo data for LOCAL development and testing only.
//
//   node --env-file=.env.local scripts/seed-demo.mjs
//
// Creates demo logins through the Supabase Auth admin API (so passwords are hashed
// properly) and fills each module with a little fictional data.
// Refuses to run against a hosted Supabase project: never put fake children in production.
// All demo accounts share the password below.
// =============================================================================
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (use --env-file=.env.local).");
  process.exit(1);
}
if (/supabase\.(co|com)/.test(url)) {
  console.error("Refusing to seed demo data into a hosted Supabase project.");
  process.exit(1);
}

export const DEMO_PASSWORD = "Demo@12345";
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PEOPLE = [
  { key: "admin", email: "admin@nakshatra.test", name: "Anita Rao", role: "admin", phone: "+91 98450 10001" },
  { key: "speech", email: "meera@nakshatra.test", name: "Meera Iyer", role: "staff", phone: "+91 98450 10002", designation: "Speech Therapist" },
  { key: "ot", email: "rahul@nakshatra.test", name: "Rahul Menon", role: "staff", phone: "+91 98450 10003", designation: "Occupational Therapist" },
  { key: "parentA", email: "priya@nakshatra.test", name: "Priya Sharma", role: "parent", phone: "+91 98450 20001" },
  { key: "parentB", email: "imran@nakshatra.test", name: "Imran Khan", role: "parent", phone: "+91 98450 20002" },
];

async function ensureUser(p) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === p.email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email: p.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role: p.role },
    user_metadata: { full_name: p.name },
  });
  if (error) throw error;
  await db.from("profiles").update({ phone: p.phone }).eq("id", data.user.id);
  if (p.role === "staff") {
    await db.from("staff_details").upsert({ profile_id: data.user.id, designation: p.designation, joined_on: "2024-06-01" });
  }
  return data.user.id;
}

async function main() {
  const ids = {};
  for (const p of PEOPLE) ids[p.key] = await ensureUser(p);
  console.log("users ready:", PEOPLE.map((p) => p.email).join(", "));

  // People and families, then each module's records (each step skips itself if already seeded).
  const { seed } = await import("./seed-demo-data.mjs");
  await seed(db, ids);
  const modules = await import("./seed-demo-modules.mjs");
  await modules.seed(db, ids);

  console.log(`done. password for all demo accounts: ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
