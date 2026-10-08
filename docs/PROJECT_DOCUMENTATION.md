# Nakshatra Child Development Center — Project Documentation

> Student & Parent Management System · living document · updated at the end of **Stage 12**

**Contents**
1. [Overview](#1-overview) · 2. [Technology](#2-technology) · 3. [Architecture](#3-architecture) ·
4. [Database](#4-database) · 5. [Roles](#5-roles) · 6. [Permissions](#6-permissions) · 7. [Folders](#7-folders) ·
8. [Environment variables](#8-environment-variables) · 9. [Running locally](#9-running-locally) ·
10. [Stages and status](#10-stages-and-status) · 11. [Testing](#11-testing) · 12. [Deployment](#12-deployment) ·
13. [Assumptions and open questions](#13-assumptions-and-open-questions) · 14. [Decision log](#14-decision-log)

---

## 1. Overview

A web application for the center's admin, therapists and parents to manage students, daily activities and
workouts, attendance, progress, home assignments, billing, notifications, payment reminders and reports.

| Who | Logs in? | Sees |
| --- | --- | --- |
| Admin | yes | everything |
| Staff / Therapist | yes | only students they are **actively** assigned to; no billing |
| Parent | yes | only their own child/children; read-only except home-task completion and comments |
| Student | no | — |

> **Requirements source.** The official requirements document was **not present** in `docs/requirements/` during the
> build. The system was built from the owner's written brief (12 stages, listed in §10). Every assumption is in §13 —
> please check them against the document and the center's practice.

## 2. Technology

| Layer | Choice | Why |
| --- | --- | --- |
| App | **Next.js 16** (App Router, Server Components, Server Actions) + **React 19** | one codebase, data stays on the server |
| Language | **TypeScript** strict, DB types generated from the schema | mistakes caught at build time |
| Styling | **Tailwind CSS 4**, self-hosted **Atkinson Hyperlegible** font | responsive, legible for parents on phones, no external font calls |
| Database | **Supabase PostgreSQL** | relational integrity: FKs, CHECKs, triggers |
| Login | **Supabase Auth** (email + password, accounts created by admin, sign-up disabled) | battle-tested |
| Authorization | **Row Level Security** in PostgreSQL | enforced in the database, not just the UI |
| Scheduling | **pg_cron** (Supabase) for payment reminders; optional `/api/cron` backup | no extra servers |
| Validation | **Zod 4** | one schema = runtime check + types |
| Tests | Vitest (unit) · SQL tests (`tests/db`) · Playwright (`tests/e2e`) | each layer proven |

Deliberately not used: separate backend server, ORM, state library, UI component library, payment gateway, SMS/WhatsApp.

**Next.js 16 notes**
- Middleware is called **Proxy** (`src/proxy.ts`): it refreshes the session cookie and redirects visitors without a
  session away from protected areas. It is *not* the security boundary.
- **Cache Components is OFF** (decision D10). Every page reads the login session, so pages render per request; no
  user's data can be cached for another user. `createClient()` reads cookies first so pages are never prerendered.
- Error boundaries receive `retry()` (not `reset()`).

## 3. Architecture

```
Browser ──HTTP + session cookie──▶ Next.js on Vercel
                                    ├─ proxy.ts            refresh session, redirect anonymous users
                                    ├─ Server Components   read data AS THE USER (RLS applies)
                                    ├─ Server Actions      requireRole → Zod → write AS THE USER (RLS applies)
                                    └─ Route handlers      /auth/confirm · /notifications/open/:id · reports CSV · /api/cron
                                             │ publishable key + user JWT
                                             ▼
                                   Supabase: Auth · PostgREST · PostgreSQL (RLS, triggers, pg_cron)
```

- **Reads** happen in Server Components through `src/features/<module>/queries.ts`.
- **Writes** are Server Actions in `src/features/<module>/actions.ts`: (1) `requireRole(...)`, (2) Zod validation,
  (3) Supabase call as the user, so RLS checks again. A unit test fails if any action skips step 1.
- **Business rules that must never be bypassed live in the database** as triggers: billing totals and statuses,
  no overpayment, who-did-it stamps, home-task status stamps, notifications, reminders, audit log.
- The **secret key** (`src/lib/supabase/admin.ts`, server-only) is used only for Auth admin calls (create/ban users,
  set passwords) after `requireRole("admin")`, and by the optional cron endpoint.
- Supabase returns at most 1000 rows per request; totals and reports use `fetchAll()` (paging).

## 4. Database

One migration per stage in `supabase/migrations/`. Conventions: UUID keys, `created_at/updated_at`,
`created_by/updated_by` stamped **from the JWT** by trigger (clients cannot fake them), status columns as
`text + CHECK`, money as `numeric(12,2)`, dates in **Asia/Kolkata** (database timezone).

| Table | Purpose | Key rules |
| --- | --- | --- |
| `profiles` | one row per login (role, name, phone, active) | role comes only from `app_metadata` (server-set); last admin can't be demoted |
| `staff_details` | designation, specialization, qualification, joined | staff only |
| `parents` | parent/guardian contact; optional login (`profile_id`) | phone or email required |
| `students` | the children | auto admission no. `NCDC-YYYY-NNNN`; discharge needs a date; never deleted |
| `student_parents` | child ↔ parent, relationship, one primary contact | admin only |
| `student_staff_assignments` | therapist ↔ child with history | active while `starts_on ≤ today < ends_on`; ending removes access immediately |
| `activities` | catalogue of activities and workouts | admin writes, staff read |
| `student_activities` | a child's activity/workout on a date | status, 1–5 rating, staff remarks, `completed_at`; cannot move to another child |
| `attendance` | one row per child per day | present/late/absent/leave; times only when present/late |
| `progress_updates` | dated assessment per development area | level 1–5, trend, observations, improvement, attention, home recommendations; `shared_with_parent` |
| `home_assignments` | task for parents | pending → completed (parent, via function) → reviewed (staff); send back clears stamps |
| `home_assignment_comments` | append-only conversation | author and child taken from login/assignment |
| `fees` | what is owed | `amount_paid`, `balance`, `status` computed from payments; cancel needs reason |
| `payments` | money received | receipt no. `RCPT-YYYY-NNNNN`; no overpayment; voided (with reason), never deleted |
| `notifications` | in-app inbox | created only by triggers; recipient may only change `read_at` |
| `app_settings` | reminder settings (single row) | admin only |
| `payment_reminders` | reminder log | one per fee/kind/day |
| `audit_log` | who changed what, when (old/new values) | written only by triggers; admin read; append-only |

**Database functions callable from the app** (all check the caller): `complete_home_assignment`,
`get_staff_names` (names only), `get_student_therapists`, `run_payment_reminders` (admin or scheduler).

**Payment reminders** — `run_payment_reminders()` daily at 09:00 IST: *before due* (N days before, once),
*due today* (once), *overdue* (repeats every M days) until paid; N, M and on/off in **Billing → Reminders**.

## 5. Roles

| Role | Created by | Main capabilities |
| --- | --- | --- |
| Admin | `scripts/create-admin.mjs` (first), then other admins | everything |
| Staff | admin (User accounts) | assigned students: attendance, activities/workouts + outcomes, progress, home tasks + review, reports (no billing) |
| Parent | admin (Parents → Create login, or User accounts) | own children: overview, activities, attendance, progress (shared only), home tasks (done + comments), fees, receipts, notifications |

## 6. Permissions

Enforced by RLS policies using helper functions in the `private` schema (not exposed to the API):
`current_app_role`, `is_admin`, `is_staff`, `is_assigned_staff(student)`, `is_parent_of(student)`,
`can_view_student(student)` = admin OR assigned staff OR own parent, `can_manage_student(student)` = admin OR assigned staff.

| Data | Admin | Assigned staff | Parent (own child) | Anonymous |
| --- | --- | --- | --- | --- |
| Students, parent links | read/write | read | read | ✗ |
| Activities, attendance | read/write | read/write | read | ✗ |
| Progress | read/write | read/write | read **shared only** | ✗ |
| Home assignments | read/write | read/write/review | read, complete (function), comment | ✗ |
| Fees, payments, reminders | read/write | ✗ | read | ✗ |
| Staff contact details | read | colleagues | ✗ (names only via function) | ✗ |
| Notifications | own | own | own | ✗ |
| Audit log, settings | read | ✗ | ✗ | ✗ |

Nobody can delete history (activities, attendance, progress, home tasks, comments, fees, payments, audit).
`tests/db/14_security_audit.sql` scans the whole schema: RLS on every table, no anonymous privileges, no
client-usable sequences, `search_path` pinned on every SECURITY DEFINER function, per-child read rules.

## 7. Folders

```
src/app/                 routes only (thin): (auth), admin, staff, parent, account, notifications, receipts, api
src/features/<module>/   queries.ts · actions.ts · schemas.ts · components/   (auth, users, students, parents, staff,
                         activities, attendance, progress, home-assignments, billing, notifications, reports, dashboard)
src/components/          app-shell (sidebar, mobile menu, bell) + ui kit (form, layout, tabs, toasts, …)
src/lib/                 auth (roles, session), supabase clients, validation, constants, utils
supabase/migrations/     one SQL file per stage
tests/db/                SQL security tests        tests/e2e/   Playwright tests
scripts/                 seed-demo*.mjs, create-admin.mjs, local-stack/, db-test.sh
```

## 8. Environment variables

| Name | Public? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | publishable key; safe only because of RLS |
| `NEXT_PUBLIC_SITE_URL` | yes | base URL for email links |
| `SUPABASE_SECRET_KEY` | **secret** | server only; bypasses RLS |
| `CRON_SECRET` | secret, optional | enables `/api/cron/payment-reminders` |

`.env.local` is git-ignored; production values live in Vercel.

## 9. Running locally

See README. Two options: `npx supabase start` (Docker Desktop) or `npm run stack:start -- --reset` (Linux, no Docker:
Postgres 16 + Supabase Auth + PostgREST downloaded from GitHub releases). Then `npm run seed:demo` and `npm run dev`.

After adding a migration: apply it (`npx supabase db reset`, or restart the local stack with `--reset`), then
regenerate types: `npm run db:types` (Supabase CLI) or
`npx supabase gen types --lang typescript --db-url "postgresql://postgres@127.0.0.1:54322/postgres?sslmode=disable" --schema public > src/types/database.ts`.

## 10. Stages and status

| # | Stage | Status | Main tests |
| --- | --- | --- | --- |
| 1 | Foundation: login/logout, password reset, roles, protected areas, layouts, account management | ✅ | role landing, wrong-role redirects, deactivation lock-out, open-redirect guard |
| 2 | Students, parents, staff, assignments, search | ✅ | admission numbers, staff limited to assigned, immediate end of access |
| 3 | Activities & workouts, status, remarks, attendance | ✅ | one attendance/day, no cross-child moves, no deletes |
| 4 | Progress (observations, improvement, attention, history) | ✅ | internal notes hidden from parents |
| 5 | Parent portal | ✅ | 404 on every tab of another family's child, no staff contact leakage |
| 6 | Home assignments (pending/completed/reviewed, comments) | ✅ | parent completes only via function, append-only comments |
| 7 | Billing (fees, payments, status, pending amount, remarks) | ✅ | exact paise, no overpayment, voids recalculate, staff see nothing |
| 8 | In-app notifications (activity, assignment, progress, attendance, payment) | ✅ | recipient-only, batch de-duplication, no self-notifications |
| 9 | Automatic payment reminders (before / on / after due) | ✅ | exact cadence, never twice, stop when paid |
| 10 | Reports + CSV with student/date filters | ✅ | numbers correct past the 1000-row limit, staff scope, CSV injection |
| 11 | Admin dashboard | ✅ | key numbers, upcoming, recent updates feed |
| 12 | Testing & production readiness | ✅ | schema-wide security audit, every page on a phone, CI |

Live deployment itself needs the owner's Supabase and Vercel accounts: see `docs/DEPLOYMENT.md`.

## 11. Testing

| Layer | Where | Count | Runs in CI |
| --- | --- | --- | --- |
| Database security, integrity, billing maths, reminders | `tests/db/*.sql` | 190+ assertions | ✅ |
| Unit (validation, roles, env, paging, CSV, action guards) | `src/**/*.test.ts` | 58 | ✅ |
| Browser end-to-end, every role, phone layout | `tests/e2e/*.spec.ts` | 57 | ✅ |

The DB suite has been checked to fail when a policy is sabotaged. E2E tests run against the real Supabase Auth
server and PostgREST (with the same 1000-row cap as Supabase).

## 12. Deployment

Step-by-step guide, checklist, backups and release process: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## 13. Assumptions and open questions

Built-in assumptions — confirm or tell the developer what to change:

| # | Assumption | Where to change |
| --- | --- | --- |
| A1 | Only admins edit student records; therapists read them | `students` RLS |
| A2 | Therapists see only actively assigned students; ending an assignment removes access immediately | `is_assigned_staff` |
| A3 | Admins are not assigned as therapists | assignment trigger |
| A4 | Parents sign in with email + password (no phone OTP) | Supabase Auth |
| A5 | Admission numbers auto-generated `NCDC-YYYY-NNNN` unless typed | stage 2 migration |
| A6 | Attendance once per child per day (present / late / absent / leave) | `attendance` |
| A7 | Progress: development areas list + level 1–5 + trend; therapists choose what parents see | `DEVELOPMENT_AREAS`, `shared_with_parent` |
| A8 | Parents see therapist names only, never staff phone/email | `get_staff_names` |
| A9 | Parents see diagnosis and medical notes of their own child | students RLS |
| A10 | Billing: per-student fees with optional discount; manual payments (cash/UPI/bank/card/cheque); no GST invoices; no online payment gateway | billing migration |
| A11 | Reminders in-app only, default 3 days before / due day / every 7 days overdue | Billing → Reminders |
| A12 | Records are kept indefinitely; nothing is deleted | — |
| A13 | Attendance and activity outcome notifications go to parents every time | stage 8–9 triggers |

Not built (possible next steps): email/WhatsApp/SMS delivery of notifications (an outbox table can be added
without changing the triggers), student photos and file attachments (Supabase Storage, private buckets),
online payments (gateway webhook → `payments`), GST invoices, multi-branch support, data export for a parent
(DPDP Act right of access).

## 14. Decision log

| # | Decision | Why |
| --- | --- | --- |
| D1 | No `admins`/`users` tables; Supabase Auth + `profiles.role` | one source of truth, instant role changes |
| D2 | `parents` separate from `profiles` | parents can exist before/without a login |
| D3 | Assignment history with start/end dates, never deleted | complete history; drives staff access |
| D4 | Business rules in triggers (billing, stamps, notifications) | can't be bypassed by any client or future screen |
| D5 | Generic `audit_log` | complete "who changed what" history; powers the dashboard feed |
| D6 | Role follows `app_metadata` also on UPDATE | Supabase Auth sets it after insert (bug found with the real Auth server) |
| D7 | Assignment `ends_on` exclusive | "End assignment" removes access now, not at midnight |
| D8 | Parents complete tasks through a database function | narrow write without opening the table |
| D9 | Amounts sent to Postgres as strings | exact paise, no floating point |
| D10 | Cache Components off; pages dynamic | per-user app; no cross-user caching risk; simpler code |
| D11 | Success messages as toasts in the page frame | still visible when the form disappears after saving |
| D12 | Notification links are plain `<a>` | `<Link>` prefetch would mark notifications read just by viewing |
| D13 | Database timezone Asia/Kolkata | "today" means the center's day |
| D14 | `fetchAll()` paging for totals/reports | Supabase caps responses at 1000 rows |
| D15 | No `loading.tsx` streaming in role areas | keeps correct 404 status for inaccessible records; pages load in < 1 s |
| D16 | Docker-free local stack for CI/Linux | E2E tests against the real Auth server on every push |
