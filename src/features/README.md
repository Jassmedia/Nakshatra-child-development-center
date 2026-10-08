# Feature modules

One folder per business domain:

| Folder | What |
| ------ | ---- |
| `auth/` | sign in/out, password reset, own profile |
| `users/` | admin: login accounts |
| `students/` | student records, tabs, profile components |
| `parents/` | parent records, links, parent portal queries |
| `staff/` | staff details, assignments, names-only helpers |
| `activities/` | catalogue, daily activities/workouts, outcomes |
| `attendance/` | daily register, monthly view |
| `progress/` | progress updates, level charts |
| `home-assignments/` | parent tasks, review, comments |
| `billing/` | fees, payments, receipts, reminder settings |
| `notifications/` | inbox |
| `reports/` | report definitions, CSV |
| `dashboard/` | admin dashboard data |

Inside a module:

```
<module>/
├── queries.ts      # import "server-only"; reads via createClient() from @/lib/supabase/server
├── actions.ts      # "use server"; requireRole(...) FIRST → Zod parse → Supabase write → revalidate
├── schemas.ts      # Zod schemas shared by forms and actions
└── components/     # UI used only by this module
```

Routes in `src/app/admin|staff|parent` stay thin and import from here. The database (RLS) decides what each
role can see, so the same query safely serves the staff page and the parent page.
