# Project rules — Nakshatra CDC

@AGENTS.md

Read `docs/PROJECT_DOCUMENTATION.md` before changing anything. The official requirements document
(in `docs/requirements/`) is the source of truth for functional behaviour.

## Development rules

1. Build only what the current step asks for. Do not implement later steps early.
2. Do not change requirements without explaining why.
3. Keep it simple: one developer must be able to maintain it.
4. Never expose sensitive data; never hardcode keys, secrets or passwords.
5. Never rely on frontend-only permission checks. RLS is the real guard.
6. Use proper relationships, constraints and migrations. No dashboard schema edits.
7. Keep history: discharge/deactivate/end — don't delete records that form a child's history.
8. Validate all input with Zod in Server Actions; the DB constraints are the final guard.
9. TypeScript strict; use generated `Database` types (`npm run db:types` after each migration).
10. Mobile-first, responsive UI (verify at 375px).
11. Test each module before moving on; never claim something works without running it.

## Security checklist for every new table

- `enable row level security` + minimal `grant`s + policies in the SAME migration.
- Child-related tables carry `student_id` and use `private.can_view_student(student_id)` for reads.
- Add tests in `tests/db/` proving other-family access FAILS and staff are limited to assigned students.
- `src/lib/supabase/admin.ts` (secret key, bypasses RLS) only after `requireRole('admin')`, only for what RLS can't do.
- Never put a Supabase query inside a plain `'use cache'` function (cross-user data leak).

## Commands

`npm run check` (lint + typecheck + unit + DB tests) · `npm run build` · `npm run test:db`
