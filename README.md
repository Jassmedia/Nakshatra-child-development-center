# Nakshatra Child Development Center — Student & Parent Management System

A web application for Nakshatra Child Development Center to manage students, parents, staff/therapists,
daily activities, attendance, progress, home assignments, billing and notifications.

**Roles:** Admin (everything) · Staff/Therapist (assigned students only) · Parent (own children only).
Students do not log in.

**Status:** Step 1 of 12 — foundation (architecture, database foundation, security model, project structure).

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Row Level Security, Storage) ·
Zod · Vitest · GitHub Actions

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in Supabase URL + keys (never commit this file)
npm run dev                    # http://localhost:3000
```

Optional local database (needs Docker): `npx supabase start`, then copy the keys from `npx supabase status`
into `.env.local`.

## Checks

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # unit tests
npm run test:db     # database migrations + Row Level Security tests (needs PostgreSQL binaries)
npm run build       # production build
```

## Documentation

Everything else — architecture, database schema, permission model, folder structure, environment variables,
Supabase setup, the 12-step roadmap, deployment and open questions — is in
**[docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)**.

## Security in one paragraph

Permissions are enforced **in the database** with Row Level Security, not only in the UI. A parent can only ever
read rows for their own child; staff only for actively assigned students; anonymous visitors get nothing.
These guarantees are proven by `tests/db/` on every push. Secrets live only in environment variables; the
Supabase secret key is used solely in server code.
