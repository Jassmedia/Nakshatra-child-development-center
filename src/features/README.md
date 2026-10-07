# Feature modules

One folder per business domain. Created in the step that builds it — not before.

| Folder | Step |
| ------ | ---- |
| `users/` (accounts, invites) | 2 |
| `students/` (incl. parents & links) | 3 |
| `staff/` (incl. assignments) | 4 |
| `activities/` | 5 |
| `attendance/`, `progress/` | 6 |
| `home-assignments/` | 8 |
| `billing/` | 9 |
| `notifications/` | 10 |
| `reports/` | 11 |

Inside a module:

```
<module>/
├── queries.ts      # import "server-only"; reads via createClient() from @/lib/supabase/server
├── actions.ts      # "use server"; requireRole(...) → Zod parse → Supabase write → revalidate
├── schemas.ts      # Zod schemas shared by forms and actions
└── components/     # UI used only by this module
```

Routes in `src/app/admin|staff|parent` stay thin and import from here. The database (RLS) decides what each
role can see, so the same query can safely serve the staff page and the parent page.
