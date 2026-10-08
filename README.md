# Nakshatra Child Development Center — Student & Parent Management System

A web application for Nakshatra Child Development Center: students, parents, staff/therapists, daily
activities and workouts, attendance, progress, home assignments, billing, notifications, automatic payment
reminders, reports and an admin dashboard.

| Role | Signs in | Sees and does |
| --- | --- | --- |
| **Admin** | yes | everything: accounts, students, staff, billing, reports, settings |
| **Staff / Therapist** | yes | only students actively assigned to them: attendance, activities, progress, home tasks |
| **Parent** | yes | only their own children: activities, attendance, progress, home tasks (mark done, comment), fees, receipts |
| **Student** | no | — |

**Status:** all 12 stages built and tested (see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) §10).
Production deployment: follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Tech stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (PostgreSQL,
Auth, Row Level Security, pg_cron) · Zod · Vitest · Playwright · GitHub Actions

## Run it locally

You need Node.js 22 and a Supabase database. Pick one:

**A. Supabase CLI (Windows / macOS / Linux, needs Docker Desktop)**

```bash
npm install
npx supabase start                 # local Supabase; applies supabase/migrations
npx supabase status                # copy API URL + publishable + secret keys into .env.local (see .env.example)
npm run seed:demo                  # fictional demo data + demo logins
npm run dev                        # http://localhost:3000
```

**B. No Docker (Linux / CI)**

```bash
npm install
npm run stack:start -- --reset     # Postgres 16 + Supabase Auth + PostgREST; writes .env.local
npm run seed:demo
npm run dev
```

Demo logins (local only), password `Demo@12345`: `admin@nakshatra.test`, `meera@nakshatra.test` and
`rahul@nakshatra.test` (therapists), `priya@nakshatra.test` and `imran@nakshatra.test` (parents).

## Checks

```bash
npm run lint && npm run typecheck   # code quality + types
npm test                            # unit tests (incl. "every server action checks the caller")
npm run test:db                     # 190+ database security tests (RLS, constraints, billing maths, reminders)
npm run build                       # production build
npm run test:e2e                    # 57 browser tests per role, incl. phone layout (needs a seeded stack + build)
```

All of these run in GitHub Actions on every push.

## How security works (one paragraph)

Permissions are enforced **inside the database** with Row Level Security, not only in the screens. A parent can only
ever read rows for their own child; a therapist only for actively assigned children (ending an assignment removes
access immediately); billing is admin-only; history (activities, attendance, progress, payments) can't be deleted;
every change is written to an audit log. Server Actions re-check the user's role and validate input with Zod before
the database checks again. The Supabase secret key is used only in server code, after an admin check.
Automated tests prove all of this on every push.

## Where things are

```
src/app/            routes: (auth)/login, admin/*, staff/*, parent/*, notifications, receipts, api/cron
src/features/       one folder per module: queries.ts (reads) · actions.ts (writes) · schemas.ts (validation) · components/
src/components/     app shell + UI kit
supabase/migrations one SQL file per stage — tables, RLS, triggers
tests/db/           database security tests        tests/e2e/   browser tests
scripts/            seed-demo, create-admin, local-stack, db-test
docs/               PROJECT_DOCUMENTATION.md (architecture, schema, permissions, decisions) · DEPLOYMENT.md
```
