#!/usr/bin/env node
// =============================================================================
// Create (or promote) an ADMINISTRATOR account. Use once to bootstrap production,
// or any time an admin is locked out.
//
//   node --env-file=.env.production.local scripts/create-admin.mjs admin@center.in "Full Name"
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. The password is asked
// for interactively (never pass it on the command line: it would stay in history).
// =============================================================================
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!email || !fullName) {
  console.error('Usage: node --env-file=<env file> scripts/create-admin.mjs <email> "<Full Name>"');
  process.exit(1);
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (use --env-file).");
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
console.log(`Supabase project: ${url}`);
const password = await rl.question("Password for the new admin (8+ chars, upper, lower, number): ");
rl.close();
if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(password)) {
  console.error("Password too weak: use 8+ characters with an uppercase letter, a lowercase letter and a number.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("Could not reach Supabase Auth:", listError.message);
  process.exit(1);
}
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let userId;
if (existing) {
  const { error } = await db.auth.admin.updateUserById(existing.id, { password, app_metadata: { role: "admin" }, ban_duration: "none" });
  if (error) throw error;
  userId = existing.id;
  console.log("Existing account found: promoted to administrator and password reset.");
} else {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log("Administrator account created.");
}

// The database trigger copies the role; make sure the profile is active and named.
const { error: profileError } = await db.from("profiles").update({ role: "admin", is_active: true, full_name: fullName }).eq("id", userId);
if (profileError) throw profileError;
console.log(`Done. Sign in at your site with ${email}.`);
