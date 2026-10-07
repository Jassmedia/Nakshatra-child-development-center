# Nakshatra Child Development Center — Project Documentation

> Student & Parent Management System · Living document · Last updated in **Step 1** (foundation)

**Contents**

1. [Project overview](#1-project-overview)
2. [Technology stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database schema](#4-database-schema)
5. [User roles](#5-user-roles)
6. [Permission model (RLS)](#6-permission-model-rls)
7. [Folder structure](#7-folder-structure)
8. [Environment variables](#8-environment-variables)
9. [Supabase setup](#9-supabase-setup)
10. [Development phases (12-step roadmap)](#10-development-phases-12-step-roadmap)
11. [How to run the project](#11-how-to-run-the-project)
12. [Testing](#12-testing)
13. [How to deploy later](#13-how-to-deploy-later)
14. [Risks and open questions](#14-risks-and-open-questions)
15. [Decision log](#15-decision-log)

---

## 1. Project overview

A web application for **Nakshatra Child Development Center** to manage students (children receiving therapy),
their parents, staff/therapists, daily activities and workouts, attendance, progress, parent home assignments,
billing and payments, notifications, reports, and a complete history per student.

| Who                  | Logs in? | Sees                                                     |
| -------------------- | -------- | -------------------------------------------------------- |
| **Admin**            | Yes      | Everything                                               |
| **Staff / Therapist**| Yes      | Only students they are actively assigned to              |
| **Parent**           | Yes      | Only their own child / children                          |
| **Student**          | **No**   | —                                                        |

> **Requirements source.** The project requirements document is the source of truth for functional
> requirements. It was **not available in the repository during Step 1**. The Step 1 design was made from the
> project brief, and every assumption is listed in [§14](#14-risks-and-open-questions). Store the document in
> `docs/requirements/` and reconcile the open questions **before Step 2**.

The system is built in **12 steps** ([§10](#10-development-phases-12-step-roadmap)). Each step adds one module,
with its own migration and tests, without rewriting the foundation.

---

## 2. Technology stack

| Layer           | Choice                                       | Why                                                                 |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Frontend        | **Next.js 16** (App Router) + **React 19**   | Server Components keep data access on the server; one codebase.     |
| Language        | **TypeScript** (strict)                      | Catches mistakes at build time; DB types are generated from schema. |
| Styling         | **Tailwind CSS 4**                           | Responsive by default (mobile-first utilities), no CSS files to manage. |
| Database        | **Supabase PostgreSQL**                      | Real relational DB: foreign keys, constraints, transactions.        |
| Auth            | **Supabase Auth** (email + password, admin-created accounts) | Battle-tested; integrates with RLS through `auth.uid()`. |
| Authorization   | **PostgreSQL Row Level Security**            | Permissions enforced *inside the database*, not just in the UI.     |
| File storage    | **Supabase Storage** (private buckets) — from Step 3 | Same permission model as the database.                      |
| Validation      | **Zod 4**                                    | One schema = runtime validation + TypeScript types.                 |
| Unit tests      | **Vitest**                                   | Fast, zero-config for TypeScript.                                   |
| DB tests        | Plain SQL assertions + `scripts/db-test.sh`  | Proves RLS rules with real PostgreSQL, no Docker required.          |
| CI              | **GitHub Actions**                           | Runs lint, typecheck, unit tests, build and DB security tests on every push. |
| Hosting (later) | **Vercel** (recommended) + Supabase Cloud    | Zero-ops for one developer; see [§13](#13-how-to-deploy-later).     |

**Deliberately NOT used:** a separate backend server/API framework, an ORM, a state-management library,
a UI component library, WhatsApp/SMS providers, payment gateways. Each can be added later if a real need appears.

### Next.js 16 specifics every developer must know

- **Middleware is now called Proxy** → `src/proxy.ts`. It runs before requests and is used only to refresh
  the Supabase session cookie (and, from Step 2, for *optimistic* redirects). It is **not** a security boundary.
- **Cache Components is enabled** (`cacheComponents: true`). Consequences:
  - Anything that reads cookies (i.e. every Supabase query as the logged-in user) must render inside `<Suspense>`.
  - **Never wrap a Supabase query in a plain `'use cache'` function.** The result would be cached on the server
    and could be served to a *different user*. Per-user data is always fetched dynamically.
- `AGENTS.md` (generated by Next.js) points to the version-matched docs in `node_modules/next/dist/docs/`.

---

## 3. Architecture

### 3.1 Big picture

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>Client Components]
  end

  subgraph NextJS[Next.js server · Vercel]
    PX[proxy.ts<br/>session refresh]
    RSC[Server Components<br/>read data]
    SA[Server Actions<br/>validate + write]
    RH[Route Handlers<br/>webhooks · later]
  end

  subgraph Supabase
    AUTH[Supabase Auth]
    API[PostgREST API]
    DB[(PostgreSQL<br/>+ RLS policies)]
    ST[Storage<br/>private buckets]
    CRON[pg_cron · Step 10]
  end

  UI -- HTTP + session cookie --> PX --> RSC
  UI -- form submit --> SA
  RSC -- publishable key + user JWT --> API
  SA -- publishable key + user JWT --> API
  SA -. secret key, admin-only tasks .-> AUTH
  RH -. secret key, verified webhooks .-> API
  API --> DB
  AUTH --> DB
  ST -- policies call same helpers --> DB
  CRON --> DB
```

### 3.2 Frontend architecture

- **Server Components by default.** Pages fetch data on the server with the user's session. The browser never
  receives more data than the page renders.
- **Client Components only for interactivity** (forms, toggles). They submit to **Server Actions**.
- **Route areas per role** (built from Step 2): `/admin/*`, `/staff/*`, `/parent/*`, and `/login`.
  Each area's layout calls `requireRole(...)` on the server.
- **Responsive, mobile-first.** Parents will mostly use phones; staff may use tablets during sessions.
  Layouts are verified at 375px width with no horizontal scrolling.

### 3.3 Backend architecture

There is **no separate backend server**. The backend is:

1. **Next.js server code** — Server Components (reads), Server Actions (writes), Route Handlers (webhooks, later).
   Every Server Action: (a) re-checks the user with `requireRole`, (b) validates input with Zod,
   (c) talks to Supabase **as the user**, so RLS applies again.
2. **PostgreSQL itself** — constraints, triggers (audit log, `updated_at`, role integrity) and RLS policies.
   Complex multi-table writes (e.g. "record payment and update invoice status") will be implemented as
   PostgreSQL functions (RPC) so they are atomic.

### 3.4 Database architecture

- One PostgreSQL database (Supabase). Application tables in `public`; security helpers in `private`
  (not exposed by the REST API).
- **Schema changes only via migrations** in `supabase/migrations/` — never by clicking in the dashboard.
- UUID primary keys (safe to expose in URLs, hard to guess). `audit_log` uses a bigint identity.
- Integrity is enforced in the DB: foreign keys, `CHECK` constraints, partial unique indexes, triggers.
- **History is preserved:** students are discharged (not deleted); therapist assignments are ended (not deleted);
  every change to core tables is written to `audit_log` with who/when/old/new.

### 3.5 Authentication architecture

- **Supabase Auth, email + password.** Public sign-up is **disabled**. The Admin creates staff and parent accounts
  (Supabase "invite user" / admin API) from the Admin UI (Step 2/4), which sends a set-password email.
- Session is stored in **HTTP-only cookies** via `@supabase/ssr`; `src/proxy.ts` refreshes it on every request.
- On the server, identity is established with `supabase.auth.getClaims()` (verifies the JWT) — **never** with
  `getSession()` alone.
- When an Auth user is created, the trigger `on_auth_user_created` inserts a `profiles` row. The role is read from
  `app_metadata.role` (only settable with the secret key), **never from `user_metadata`** (editable by the user).
  If no valid role is given, the user becomes a `parent` with no linked children → sees nothing.

### 3.6 Authorization / role architecture

Two layers, the second one being the real guarantee:

| Layer | Where | Purpose |
| ----- | ----- | ------- |
| 1. UX guard | `requireRole()` in layouts/actions, `hasRole()` for menus | Send users to the right area; hide irrelevant UI. |
| 2. **Data guard** | **RLS policies in PostgreSQL** | Even a hand-crafted API request with a valid login cannot read or change data it is not allowed to. |

Details in [§6](#6-permission-model-rls).

### 3.7 Storage architecture (implemented in Step 3 / Step 8)

- **Private buckets only** — no public URLs for children's photos or documents.
  - `student-photos` (Step 3), `assignment-attachments` (Step 8). Size limit ~5 MB, images/PDF only.
- **Path convention:** `<student_id>/<category>/<random-uuid>.<ext>` — the first folder is the student id.
- **Storage policies reuse the same helper:** `private.can_view_student((storage.foldername(name))[1]::uuid)`,
  so storage permissions can never drift from table permissions.
- Files are shown through short-lived **signed URLs** generated on the server.
- The DB stores only the object path (e.g. `students.photo_path`).

### 3.8 Notification architecture (implemented in Step 10)

```mermaid
flowchart LR
  EV[Event: assignment created,<br/>invoice issued, etc.] --> FN[SQL function / Server Action]
  CR[pg_cron daily job] --> RM[find due/overdue invoices]
  FN --> N[(notifications<br/>in-app inbox)]
  RM --> N
  N --> UI[Bell / inbox in UI]
  N -. optional .-> OB[(notification_deliveries<br/>outbox: email; later SMS/WhatsApp)]
  OB --> W[Edge Function / server job sends + marks status]
```

- **In-app notifications first:** a `notifications` table (recipient, type, title, body, link, read_at) with RLS
  "recipient only".
- **Automatic payment reminders:** a scheduled database job (Supabase `pg_cron`) creates reminder notifications
  for invoices that are due/overdue. Idempotent: one reminder per invoice per reminder-type.
- **External channels (email, later SMS/WhatsApp)** go through an *outbox* table so the core logic never depends on
  a provider. WhatsApp/SMS are **future enhancements** and are not part of the initial build.

### 3.9 Future payment architecture (Step 9 + optional later)

- **Step 9 = manual payments**: Admin records payments received (cash, UPI, bank transfer, cheque, card)
  against invoices. Invoice status (`issued` → `partially_paid` → `paid`) is computed in the database.
- **Optional online payments later** (e.g. an Indian gateway such as Razorpay):
  1. Server creates a gateway order for an invoice (secret key on server only).
  2. Parent pays on the gateway's checkout page.
  3. Gateway calls our **webhook Route Handler**, which verifies the signature with
     `PAYMENT_GATEWAY_WEBHOOK_SECRET`, then records the payment with the secret Supabase key.
  4. `payments.gateway_payment_id` is UNIQUE → duplicate webhooks cannot double-count.
  5. **The browser's "payment success" redirect is never trusted** — only the verified webhook.
- No card data is ever stored by us.

---

## 4. Database schema

### 4.1 Conventions

- Table names: plural `snake_case`. Primary key `id uuid default gen_random_uuid()`.
- Timestamps: `created_at`, `updated_at` (`timestamptz`), `updated_at` maintained by trigger.
- "Who did it": `created_by` / `assigned_by` / `recorded_by` → `profiles.id`.
- Status fields: `text` + `CHECK` constraint (easy to evolve). Roles: PostgreSQL `enum` (stable).
- **RLS is row-level, not column-level.** If some columns must be hidden from a role (e.g. internal staff notes
  hidden from parents), they go in a **separate table** with its own policies.
- Never hard-delete records that are part of a child's history.

### 4.2 Entity-relationship diagram

Solid = **created in Step 1**. Others are **planned** and are created by the migration of their step.

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "1 login = 1 profile"
  PROFILES ||--o| STAFF_DETAILS : "staff only"
  PROFILES |o--o| PARENTS : "parent login (optional)"
  PARENTS ||--o{ STUDENT_PARENTS : ""
  STUDENTS ||--o{ STUDENT_PARENTS : ""
  STUDENTS ||--o{ STUDENT_STAFF_ASSIGNMENTS : ""
  PROFILES ||--o{ STUDENT_STAFF_ASSIGNMENTS : "staff"

  ACTIVITIES ||--o{ STUDENT_ACTIVITY_PLANS : "planned S5"
  STUDENTS ||--o{ STUDENT_ACTIVITY_PLANS : "planned S5"
  STUDENT_ACTIVITY_PLANS ||--o{ ACTIVITY_SESSIONS : "planned S5"
  STUDENTS ||--o{ ATTENDANCE : "planned S6"
  STUDENTS ||--o{ PROGRESS_RECORDS : "planned S6"
  STUDENTS ||--o{ HOME_ASSIGNMENTS : "planned S8"
  HOME_ASSIGNMENTS ||--o{ HOME_ASSIGNMENT_UPDATES : "planned S8"
  STUDENTS ||--o{ INVOICES : "planned S9"
  INVOICES ||--o{ PAYMENTS : "planned S9"
  PROFILES ||--o{ NOTIFICATIONS : "planned S10"
```

### 4.3 Evaluation of the candidate entities

| Candidate                | Decision | Reason |
| ------------------------ | -------- | ------ |
| Users                    | **Use Supabase `auth.users`** | Supabase already manages logins; we never duplicate passwords. |
| Profiles                 | **Table** `profiles` | App data for each login, including the `role`. |
| Admins                   | **No table** | An admin has no extra data. `profiles.role = 'admin'` is enough. |
| Staff                    | **Table** `staff_details` (1:1 with profile) | Staff-only fields (designation, qualification). Staff always have a login. |
| Parents                  | **Table** `parents` | A parent/guardian is a *contact record* that may exist **before or without** a login (needed for reminders). `profile_id` links a login when invited. |
| Students                 | **Table** `students` | No login, so not linked to `auth.users`. |
| Student–parent           | **Table** `student_parents` | Many-to-many (siblings; two parents per child). |
| Student–staff            | **Table** `student_staff_assignments` | Many-to-many **with history** (`starts_on`/`ends_on`). Drives staff permissions. |
| Activities               | **Table** `activities` (S5) | Reusable catalogue of activities/workouts. |
| Activity assignments     | **Table** `student_activity_plans` (S5) | Which activity a child should do, with goals/frequency. |
| Activity updates         | **Table** `activity_sessions` (S5) | Daily log of what was actually done and how it went. |
| Attendance               | **Table** `attendance` (S6) | One row per student per day. |
| Progress records         | **Table** `progress_records` (S6) | Periodic assessments per development area. |
| Home assignments         | **Table** `home_assignments` (S8) | Tasks for parents to do at home with the child. |
| Assignment updates       | **Table** `home_assignment_updates` (S8) | Parent/staff updates & feedback on a home task (history). |
| Billing records          | **Table** `invoices` (S9) | What is owed, per student, per period. |
| Payments                 | **Table** `payments` (S9) | What was paid, against which invoice. |
| Notifications            | **Table** `notifications` (S10) | In-app inbox per user. |
| (extra) Audit log        | **Table** `audit_log` (S1) | Required for "complete student history": who changed what and when. |

### 4.4 Tables created in Step 1

Migration: `supabase/migrations/20261007120000_step01_foundation.sql`

#### `profiles` — one row per login
| Column | Type | Req. | Notes |
| ------ | ---- | ---- | ----- |
| `id` | uuid **PK**, **FK → auth.users(id)** on delete cascade | ✔ | Same id as the Auth user |
| `role` | `app_role` enum (`admin`/`staff`/`parent`) | ✔ | Default `parent`. Only Admin can change it |
| `full_name` | text ≤200 | ✔ | Default `''` |
| `email` | text | | Copy of Auth email, kept in sync by trigger |
| `phone` | text (validated pattern) | | |
| `is_active` | boolean | ✔ | `false` = deactivated: loses all access immediately |
| `created_at`, `updated_at` | timestamptz | ✔ | |

Indexes: partial index on `role` where active. Protected by trigger `profiles_protect_columns`
(only Admin changes role/is_active/email; the last active Admin cannot be demoted or deactivated).

#### `staff_details` — staff-only information (1:1)
`profile_id` **PK/FK → profiles** (must have role `staff`, enforced by trigger) · `designation` · `specialization` ·
`qualification` · `joined_on` · timestamps.

#### `parents` — parent/guardian contact records
| Column | Type | Req. | Notes |
| ------ | ---- | ---- | ----- |
| `id` | uuid **PK** | ✔ | |
| `profile_id` | uuid **UNIQUE FK → profiles** (role must be `parent`) | | NULL = no login yet |
| `full_name` | text 1–200 | ✔ | |
| `phone`, `alternate_phone`, `email`, `address` | text | | **At least one of phone/email required** |
| `created_by` | uuid FK → profiles | | |
| timestamps | | ✔ | |

#### `students` — the children
| Column | Type | Req. | Notes |
| ------ | ---- | ---- | ----- |
| `id` | uuid **PK** | ✔ | |
| `admission_number` | text **UNIQUE** | ✔ | Human-readable ID (format TBD — §14) |
| `full_name` | text 1–200 | ✔ | |
| `date_of_birth` | date | | |
| `gender` | text (`male`/`female`/`other`) | | |
| `diagnosis`, `medical_notes` | text | | Sensitive. Visible to admin, assigned staff, own parents |
| `enrollment_date` | date | ✔ | Default today |
| `status` | text (`active`/`on_hold`/`discharged`) | ✔ | `discharged` ⇔ `discharged_on` set (CHECK) |
| `discharged_on` | date | | ≥ `enrollment_date` |
| `photo_path` | text | | Path in private Storage bucket (Step 3) |
| `created_by` | uuid FK → profiles | | |
| timestamps | | ✔ | |

Indexes: unique `admission_number`, `status`. **Cannot be deleted via the API** (no DELETE grant).

#### `student_parents` — child ↔ parent links
`id` PK · `student_id` FK → students (restrict) · `parent_id` FK → parents (restrict) ·
`relationship` (`mother`/`father`/`guardian`/`other`) · `is_primary_contact` · `created_at`.
Unique `(student_id, parent_id)`; **at most one primary contact per child** (partial unique index);
index on `parent_id`.

#### `student_staff_assignments` — therapist ↔ child (with history)
`id` PK · `student_id` FK → students · `staff_id` FK → profiles (role must be `staff`) · `assignment_role` ·
`starts_on` (default today) · `ends_on` (NULL = ongoing; ≥ starts_on) · `notes` · `assigned_by` · timestamps.
**Active** = `starts_on ≤ today ≤ coalesce(ends_on, today)`.
Indexes on `student_id`, `staff_id`; unique open assignment per `(student_id, staff_id)`.
No DELETE: end an assignment by setting `ends_on`.

#### `audit_log` — append-only history
`id` bigint identity PK · `table_name` · `record_id` · `action` (INSERT/UPDATE/DELETE) · `changed_by`
(auth.uid(), NULL = system) · `changed_at` · `old_data` jsonb · `new_data` jsonb.
Indexes: `(table_name, record_id)`, `changed_at desc`. Written only by trigger; readable only by Admin;
**nobody can modify or delete it through the API.**

### 4.5 Planned tables (designed now, created in their step)

> These designs are **provisional** until checked against the requirements document (§14).
> Every one of them uses `private.can_view_student(student_id)` for read access.

| Step | Table | Key fields | Write access (planned) |
| ---- | ----- | ---------- | ---------------------- |
| 5 | `activities` | id, name, category, description, instructions, default_duration_min, is_active, created_by | Admin (catalogue) |
| 5 | `student_activity_plans` | id, student_id, activity_id, goal, frequency, starts_on, ends_on, status, assigned_by | Admin + assigned staff |
| 5 | `activity_sessions` | id, plan_id, session_date, performed_by, duration_min, performance_level, notes | Assigned staff |
| 6 | `attendance` | id, student_id, attendance_date, status (present/absent/late/leave), check_in, check_out, marked_by, note — **UNIQUE (student_id, attendance_date)** | Admin + assigned staff |
| 6 | `progress_records` | id, student_id, area (speech/motor/cognitive/social/behaviour…), record_date, score/level, observations, recommendations, recorded_by, shared_with_parent | Admin + assigned staff |
| 8 | `home_assignments` | id, student_id, title, instructions, assigned_by, assigned_on, due_on, status, attachment_path | Admin + assigned staff |
| 8 | `home_assignment_updates` | id, home_assignment_id, author_id, note, status_after, attachment_path, created_at (append-only) | Parent of child, assigned staff |
| 9 | `invoices` | id, invoice_number UNIQUE, student_id, period_start, period_end, issue_date, due_date, amount numeric(12,2), discount, total, status (draft/issued/partially_paid/paid/cancelled), notes, created_by | Admin |
| 9 | `payments` | id, invoice_id, amount, paid_on, method (cash/upi/bank_transfer/cheque/card/online), reference, received_by, gateway_payment_id UNIQUE NULL | Admin (gateway webhook via server) |
| 10 | `notifications` | id, recipient_id, type, title, body, link, related_table, related_id, read_at, created_at | System (functions/triggers); recipient may mark read |

Parents get **read-only** access to their children's rows in all of these, except writing
`home_assignment_updates` for their own child.

---

## 5. User roles

| Role | How the account is created | Main capabilities (full list in requirements) |
| ---- | -------------------------- | ---------------------------------------------- |
| **Admin** | First admin: bootstrap SQL (§9.4). Later: by another Admin | Manage students, parents, staff, assignments, activities, billing, reports, settings |
| **Staff / Therapist** | Invited by Admin | Work with **assigned** students: log activities, attendance, progress, home assignments |
| **Parent** | Invited by Admin, linked to their child(ren) | View own child's information; respond to home assignments; see bills |
| **Student** | No account | — |

No other roles exist. Adding one = new enum value + review of every policy.

---

## 6. Permission model (RLS)

### 6.1 Strategy

1. **RLS is enabled on every table.** No policy = no access.
2. **Table privileges are minimal:** `anon` (not logged in) has **no** privileges on any app table;
   `authenticated` only gets the verbs a table needs (e.g. no DELETE on `students`).
3. **Security helper functions** in schema `private` (not callable from the public API):

   | Function | Answers |
   | -------- | ------- |
   | `private.current_app_role()` | Role of the current user, NULL if not logged in or deactivated |
   | `private.is_admin()` / `private.is_staff()` | Shortcut role checks (active users only) |
   | `private.is_assigned_staff(student_id)` | Current user is staff with an **active** assignment to this student |
   | `private.is_parent_of(student_id)` | Current user is a parent linked to this student |
   | `private.can_view_student(student_id)` | admin OR assigned staff OR own parent — **use this in every new module** |
   | `private.staff_can_view_parent(parent_id)` | Staff may see parent contacts of their assigned students |

   They are `SECURITY DEFINER` (avoid RLS recursion), `STABLE`, use `set search_path = ''`, and only ever
   answer questions about the **current** user.
4. Policies wrap helper calls as `(select private.fn())` so PostgreSQL evaluates them once per query.
5. **The secret key bypasses RLS.** It is used only in `src/lib/supabase/admin.ts`, server-side, after
   `requireRole('admin')`, for things RLS cannot do (creating Auth users).

### 6.2 Permission matrix (Step 1 tables)

| Table | Admin | Staff | Parent | Anonymous |
| ----- | ----- | ----- | ------ | --------- |
| `profiles` | read/update all | read self + colleagues (staff/admin); update own name/phone | read/update own name/phone | ✗ |
| `staff_details` | full | read own | ✗ | ✗ |
| `parents` | full (delete only if unlinked) | read parents of **assigned** students | read own record | ✗ |
| `students` | read/create/update (no delete) | read **assigned** (active) | read **own children** | ✗ |
| `student_parents` | full | read for assigned students | read for own children | ✗ |
| `student_staff_assignments` | read/create/update (no delete) | read own (incl. past) | read for own children | ✗ |
| `audit_log` | read | ✗ | ✗ | ✗ |

### 6.3 What the tests prove (`tests/db/`)

- A parent **cannot** see another family's child, even by guessing its id.
- A parent **cannot** link themselves to another child, take over another guardian record, or re-point a link.
- A user **cannot** promote themselves to admin (neither via `profiles` nor via `user_metadata`).
- Staff see **only actively assigned** students: ended and future assignments grant nothing.
- **Deactivated** users lose access immediately even though their login token is still valid.
- Staff cannot assign themselves to students. Only admin can create students.
- Anonymous visitors cannot read anything or call the security helpers.
- The last admin cannot be demoted. The audit log records actor + old/new values and cannot be altered.
- Integrity: parents can't be assigned as therapists, one primary contact per child, no duplicate open
  assignments, discharge requires a date, linked parents can't be deleted.

### 6.4 Rules for every future module

1. New table ⇒ `enable row level security` + explicit `grant`s + policies **in the same migration**.
2. Child-related table ⇒ has `student_id` and uses `private.can_view_student(student_id)` for SELECT.
3. Add tests to `tests/db/` proving: own-family access works, **other-family access fails**, staff limited to
   assigned students, anonymous gets nothing.
4. Never trust the client: Server Actions re-check the role and validate with Zod; RLS checks again.

---

## 7. Folder structure

```
.
├── .github/workflows/ci.yml      # CI: lint, typecheck, unit tests, build, DB security tests
├── docs/
│   ├── PROJECT_DOCUMENTATION.md  # ← this file
│   └── requirements/             # put the official requirements document here
├── scripts/
│   └── db-test.sh                # runs migrations + RLS tests on a throwaway Postgres
├── supabase/
│   ├── config.toml               # local Supabase config (sign-up disabled, password policy)
│   ├── migrations/               # ALL schema changes, one file per change, never edited after merge
│   └── seed.sql                  # (optional, local only) fake demo data — never production
├── tests/db/
│   ├── setup/                    # Supabase stub (local only) + assertion helpers
│   └── 0N_*.sql                  # fixtures and security tests (run in order, rolled back)
├── src/
│   ├── proxy.ts                  # Next 16 Proxy: refreshes the session cookie
│   ├── app/                      # ROUTES ONLY (thin): pages, layouts, loading/error states
│   │   ├── (auth)/login/         #   Step 2
│   │   ├── admin/                #   Step 2+  Admin area   (layout: requireRole('admin'))
│   │   ├── staff/                #   Step 2+  Staff area   (layout: requireRole('staff'))
│   │   └── parent/               #   Step 7   Parent portal (layout: requireRole('parent'))
│   ├── features/                 # BUSINESS MODULES — one folder per domain (see features/README.md)
│   │   └── <module>/
│   │       ├── queries.ts        #   server-only reads
│   │       ├── actions.ts        #   'use server' writes (requireRole + Zod + Supabase)
│   │       ├── schemas.ts        #   Zod schemas for forms
│   │       └── components/       #   UI specific to this module
│   ├── components/ui/            # generic, reusable UI (Button, Input, Table…)
│   ├── lib/
│   │   ├── auth/                 # roles.ts (shared), session.ts (server: getCurrentUser, requireRole)
│   │   ├── supabase/             # client.ts (browser), server.ts (user), admin.ts (secret), proxy.ts
│   │   ├── validation/           # shared Zod building blocks
│   │   ├── env.ts                # public env (validated)
│   │   └── env.server.ts         # server-only secrets (build fails if imported by client code)
│   └── types/database.ts         # GENERATED from the DB schema — do not edit by hand
├── .env.example                  # template; copy to .env.local
├── CLAUDE.md / AGENTS.md         # rules for AI-assisted development
└── README.md
```

Where does Admin/Staff/Parent functionality go? **Routes** live in `src/app/admin|staff|parent`; the
**logic** for a domain (e.g. attendance) lives once in `src/features/attendance` and is reused by both the staff
page (mark attendance) and the parent page (view attendance). The database decides what each role may see.

---

## 8. Environment variables

| Variable | Public? | Used by | Description |
| -------- | ------- | ------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | browser + server | Publishable (formerly "anon") key. Safe in the browser **only because of RLS** |
| `NEXT_PUBLIC_SITE_URL` | yes | server | Base URL for auth redirect links |
| `SUPABASE_SECRET_KEY` | **NO — secret** | server only (`admin.ts`) | Secret (formerly "service_role") key; bypasses RLS |
| `EMAIL_*` | secret | Step 10 | Outgoing email provider |
| `PAYMENT_GATEWAY_*` | secret | optional, after Step 9 | Online payment gateway + webhook secret |

Rules:
- `.env.local` (local) is git-ignored; only `.env.example` is committed.
- Production/preview values are entered in the hosting dashboard (Vercel → Settings → Environment Variables).
- Never prefix a secret with `NEXT_PUBLIC_` — that ships it to every browser.
- `NEXT_PUBLIC_*` values are baked in at **build** time; changing them requires a rebuild.
- `src/lib/env.server.ts` imports `server-only`, so importing it from client code **fails the build**.
- Env is validated with Zod on first use, with a clear error naming the missing variable.

---

## 9. Supabase setup

### 9.1 Environments

| Environment | Database | App |
| ----------- | -------- | --- |
| Local | `supabase start` (Docker) — or no DB at all for UI-only work | `npm run dev` |
| Production | Supabase Cloud project `nakshatra-prod` (region: Mumbai `ap-south-1` recommended) | Vercel production |
| (optional) Staging | Second Supabase project `nakshatra-staging` | Vercel preview |

### 9.2 Local Supabase (requires Docker Desktop)

```bash
npx supabase start          # starts Postgres, Auth, Storage, Studio locally; applies migrations
npx supabase status         # prints the local URL + publishable/secret keys → put them in .env.local
npx supabase db reset       # rebuild local DB from migrations (+ supabase/seed.sql if present)
```
Local Studio: http://127.0.0.1:54323 · Local emails (invites/password resets): http://127.0.0.1:54324

### 9.3 Hosted project (when ready — Step 12 at the latest)

1. Create the project in the Supabase dashboard. Save the DB password in a password manager.
2. **Authentication → Sign In / Providers:** disable "Allow new users to sign up"; keep Email enabled;
   set minimum password length 8 with lower/upper/digits; enable "Secure password change".
3. **Authentication → URL Configuration:** Site URL = production URL; add `<url>/auth/callback` to redirect URLs.
4. **Authentication → SMTP:** configure a real SMTP sender (the built-in one is rate-limited, for testing only).
5. Link and push migrations from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push        # applies supabase/migrations to the hosted DB
   ```
6. Copy URL + publishable key + secret key into the hosting provider's env settings (never into git).

### 9.4 Bootstrapping the first Admin

Sign-up is disabled, so the very first admin is created manually:

1. Dashboard → Authentication → Users → **Add user** (email + password, auto-confirm).
2. Dashboard → SQL Editor, run:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Center Administrator'
   where email = 'admin@your-domain.com';
   ```
   (SQL Editor runs without a user JWT, which the profile-protection trigger treats as "system".)
3. All further users are created from the Admin UI (Step 2/4).

### 9.5 Making schema changes

```bash
npm run db:new-migration -- <short_name>   # creates supabase/migrations/<timestamp>_<short_name>.sql
# write SQL (tables + RLS + grants together), then:
npm run test:db                            # migrations + security tests on a throwaway Postgres
npm run db:types                           # regenerate src/types/database.ts (needs `supabase start`)
```
Never edit a migration that has already been applied to production — write a new one.

**Regenerating database types without Docker:** apply the migrations to any plain PostgreSQL that has the
stub (`tests/db/setup/supabase_stub.sql`) and run
`npx supabase gen types --lang typescript --db-url "<postgres-url>?sslmode=disable" --schema public > src/types/database.ts`.

### 9.6 Seed / test data

- `tests/db/01_fixtures.sql` — fake people/children for security tests; always rolled back.
- `supabase/seed.sql` — optional local demo data (create in Step 3 if useful). Applied **only** by local
  `supabase db reset`; `supabase db push` never runs it. **Never put real children's data in any seed file.**

---

## 10. Development phases (12-step roadmap)

Every step ends with: `npm run check` green, CI green, manual test of the new screens as each role,
and an explicit "Step N complete" before moving on.

| # | What will be built | Tables | Users | Depends on | Must be tested before moving on |
|---|--------------------|--------|-------|------------|----------------------------------|
| **1** | Architecture, project skeleton, foundation migration, RLS helpers, CI, docs | profiles, staff_details, parents, students, student_parents, student_staff_assignments, audit_log | — | — | ✅ RLS isolation tests, build, lint, typecheck, unit tests |
| **2** | Login/logout, password reset & set-password (invite) flow, role-based route areas & redirects, Admin "create user" (invite with role), deactivate user | profiles (+ Auth) | All | 1 | Each role lands in its own area; wrong-role URL redirects; deactivated user is locked out; no public sign-up; Server Actions reject wrong roles |
| **3** | Student management: list/search/filter, create/edit, discharge, parent records & linking, student photo (private Storage) | students, parents, student_parents, storage bucket `student-photos` | Admin (staff/parent read) | 2 | CRUD as admin; validation errors; parent sees only own child; photo URL inaccessible to other families |
| **4** | Staff/therapist management (invite, details, deactivate) + assigning/ending student assignments, assignment history | profiles, staff_details, student_staff_assignments | Admin, Staff | 2, 3 | Staff sees exactly assigned students; ending an assignment removes access; history visible |
| **5** | Activity/workout catalogue, per-student activity plans, daily activity session logging | activities, student_activity_plans, activity_sessions | Admin, Staff (Parent read later) | 3, 4 | Staff logs only for assigned students; catalogue admin-only; RLS tests |
| **6** | Attendance (daily marking, edits with history) + progress records by development area | attendance, progress_records | Admin, Staff | 4 | One attendance per child per day; staff limited to assigned students; progress history kept |
| **7** | Parent portal: child overview, activities, attendance, progress, therapist names (names-only view) | read-only use of S3–S6 tables + names view | Parent | 2–6 | Parent with 2 children sees both, nothing else; mobile layout; no staff phone/email leakage |
| **8** | Home assignments: staff create, parents view and post updates (with optional attachment), staff feedback | home_assignments, home_assignment_updates, bucket `assignment-attachments` | Staff, Parent, Admin | 4, 7 | Parent can update only own child's assignments; updates are append-only history |
| **9** | Billing: fee/invoice creation, manual payment recording, balance & status, parent bill view | invoices, payments (+ RPC for atomic payment recording) | Admin, Parent (read) | 3, 7 | Money in `numeric`, never float; partial payments; status recalculation; parent sees own bills only |
| **10** | In-app notifications + automatic payment reminders (scheduled), optional email channel | notifications (+ notification_deliveries if email), pg_cron job | All | 8, 9 | Reminder sent once per rule; recipients only see their own notifications |
| **11** | Admin dashboard (counts, dues, attendance %), reports (attendance, progress, billing), complete student history timeline, CSV export | views / RPCs over existing tables, audit_log | Admin (staff limited) | 3–10 | Report numbers match raw data; reports respect RLS |
| **12** | Full test pass, security review (RLS audit, Supabase advisors), performance indexes, error/empty states, backups, production deployment | all | All | 1–11 | E2E smoke tests per role, Supabase security advisor clean, backup/restore verified, production checklist (§13) |

---

## 11. How to run the project

Prerequisites: **Node.js ≥ 20.9** (22 LTS recommended), npm. Optional: Docker (for local Supabase),
PostgreSQL server binaries (for `npm run test:db`).

```bash
git clone https://github.com/Jassmedia/Nakshatra-child-development-center.git
cd Nakshatra-child-development-center
npm install
cp .env.example .env.local      # fill in values (local: from `npx supabase status`)

npx supabase start              # optional: local Supabase (Docker)
npm run dev                     # http://localhost:3000
```

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Next route types + TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Migrations + RLS security tests on a throwaway PostgreSQL |
| `npm run check` | All of the above except build |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase lifecycle |
| `npm run db:new-migration -- name` | New migration file |
| `npm run db:types` | Regenerate `src/types/database.ts` from local Supabase |

---

## 12. Testing

| Layer | Tool | Location | Runs in CI |
| ----- | ---- | -------- | ---------- |
| Database security (RLS, constraints, triggers) | plain SQL assertions | `tests/db/` | ✅ |
| Pure TypeScript logic (validation, roles, env) | Vitest | `src/**/*.test.ts` | ✅ |
| Type safety | `tsc` + generated DB types | — | ✅ |
| Build | `next build` | — | ✅ |
| End-to-end per role | Playwright (added in Step 2/12) | `tests/e2e/` | later |

`scripts/db-test.sh` modes:
- default: creates a temporary PostgreSQL cluster, applies `tests/db/setup/supabase_stub.sql` + all migrations,
  runs the tests, deletes the cluster.
- `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db`: runs against an
  existing DB that already has the migrations (e.g. local Supabase). Everything is inside one transaction that is
  **rolled back**; hosted `*.supabase.co` URLs are refused.

The test suite has been verified to **fail** when a policy is sabotaged (e.g. `students_select using (true)`),
so a green run is meaningful.

---

## 13. How to deploy later

Recommended: **Vercel** (Next.js native, free tier fits a single center) + **Supabase Cloud**.

1. Create the production Supabase project and configure Auth (§9.3). Push migrations: `npx supabase db push`.
2. Import the GitHub repo in Vercel. Framework preset: Next.js. Node 22.
3. Set env vars in Vercel for **Production** (and Preview if a staging Supabase exists). `SUPABASE_SECRET_KEY`
   must be marked sensitive. Never point Preview deployments at the production database.
4. Bootstrap the first admin (§9.4).
5. Production checklist (Step 12): Supabase Security & Performance Advisors clean; RLS enabled on all tables;
   custom SMTP configured; backups enabled (Point-in-Time Recovery on a paid plan recommended for children's
   records); custom domain + HTTPS; error monitoring; a privacy notice for parents (children's health data —
   consider India's DPDP Act obligations for children's personal data and parental consent).
6. Releases: merge to `main` → CI green → Vercel deploys. Database migrations are pushed **before** deploying
   code that needs them, and must be backwards-compatible with the currently running code.

---

## 14. Risks and open questions

**Must be answered from the requirements document / the center before the related step:**

| # | Question | Affects | Current assumption |
| - | -------- | ------- | ------------------ |
| Q1 | **The requirements document was not available in Step 1.** All module designs need to be checked against it. | All | Designed from the project brief |
| Q2 | Can staff edit student details (e.g. medical notes), or only Admin? | S3 | Admin only |
| Q3 | Should staff see **all** students or only assigned ones? Can a therapist cover for another (substitute)? | S4 | Only actively assigned; substitutes = short assignment with `ends_on` |
| Q4 | Can an Admin also act as a therapist (be assigned to students)? | S4 | No — admins already see everything; assignments require role `staff` |
| Q5 | Do all parents have an email address? Is phone/OTP login needed? (SMS OTP costs money) | S2 | Email + password; parents without email remain contact-only records |
| Q6 | Admission number format — manual or auto-generated (e.g. `NCDC-2026-001`)? | S3 | Entered manually, must be unique |
| Q7 | Attendance: once per day or per therapy session? Who marks it? | S6 | Once per day; admin or assigned staff |
| Q8 | Progress: which development areas and which scale (1–5, %, descriptive)? Is all progress visible to parents? | S6, S7 | Configurable areas; `shared_with_parent` flag |
| Q9 | Should parents see the therapist's name? Phone/email? | S7 | Name only |
| Q10 | Billing model: monthly fixed fee, per session, packages, discounts, GST invoices? | S9 | Monthly invoices with optional discount; GST TBD |
| Q11 | Online payments needed at launch, or manual recording only? | S9 | Manual only; gateway optional later |
| Q12 | Payment reminder rules: how many days before/after due date, which channel? | S10 | In-app; email optional; WhatsApp/SMS future |
| Q13 | Data retention: how long to keep discharged students' records? | S11/12 | Keep indefinitely (no deletion) |
| Q14 | Should parents see the child's diagnosis/medical notes field as stored? | S7 | Yes; internal-only notes would go in a separate staff-only table |

**Technical risks**

- **Sensitive data (children's health info).** Mitigated by RLS + private storage + audit log; needs a privacy
  notice and careful staff account management (deactivate leavers immediately).
- **Secret key misuse.** Only in `admin.ts`, server-only guard, used after admin check. Review in Step 12.
- **Next.js 16 caching.** A plain `'use cache'` on per-user queries would leak data across users — forbidden (§2).
- **`npm audit` reports 5 "high" issues** in `braces` (via `eslint-config-next` → `fast-glob`), a development-only
  lint dependency not shipped to users. The suggested "fix" downgrades the lint config to Next 14, so it was not
  applied; re-check on dependency updates.
- **Local DB tests run on PostgreSQL 16 with a Supabase stub**; hosted Supabase runs PostgreSQL 17 with the real
  Auth schema. Before production, also run the tests against local Supabase (`TEST_DATABASE_URL`, §12).

---

## 15. Decision log

| Date | Decision | Why |
| ---- | -------- | --- |
| Step 1 | No separate `admins`/`users` tables | Auth owns users; admin has no extra fields |
| Step 1 | `parents` separate from `profiles` | Parents may need to be contacted before/without a login |
| Step 1 | Assignment history with `starts_on`/`ends_on`, no deletes | Required "complete student history"; drives staff access |
| Step 1 | Role from `profiles` (not JWT custom claims) | Role changes/deactivation take effect immediately, no token refresh needed |
| Step 1 | Module tables deferred to their own step's migration | Smaller, testable steps; designs can be corrected against requirements first |
| Step 1 | Generic `audit_log` via triggers | Cheap, complete change history for every core table |
| Step 1 | Status columns as `text + CHECK`, roles as enum | Statuses evolve; roles are fundamental and stable |
