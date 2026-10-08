# Going live — production deployment guide

Target setup (recommended for one developer): **Supabase Cloud** (database, login, scheduled jobs) +
**Vercel** (the Next.js app). Both have free tiers that fit one center; upgrade Supabase to a paid plan
before real children's data goes in, for daily backups and point-in-time recovery.

Time needed: about one hour. Do the steps in order.

---

## 1. Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**.
   - Name: `nakshatra-prod` · Region: **South Asia (Mumbai)** · a strong database password (save it in a password manager).
2. **Project Settings → API keys**: note the **Project URL**, the **publishable** key (`sb_publishable_…`) and the
   **secret** key (`sb_secret_…`). The secret key bypasses all security rules — never put it in the browser,
   in Git, or in chat messages.
3. **Database → Extensions**: enable **pg_cron** (used for the 9:00 IST payment reminder job).

## 2. Configure login (Authentication)

**Authentication → Sign In / Providers**
- **Allow new users to sign up: OFF** (accounts are created by the admin only).
- Email provider: ON. **Confirm email: OFF** (the admin creates confirmed accounts).
- Password: minimum length **8**, requirements **lowercase, uppercase and digits**. Secure password change: ON.

**Authentication → URL Configuration**
- Site URL: your production address, e.g. `https://app.nakshatracdc.in`
- Redirect URLs: add `https://app.nakshatracdc.in/auth/confirm`

**Authentication → Emails → SMTP Settings** — configure a real email sender (e.g. Zoho Mail, Amazon SES,
Brevo, Resend). The built-in sender only allows a few emails per hour and is for testing.

**Authentication → Emails → Templates** — so links open correctly in the app:
- **Reset password** — link:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/password`
- **Invite user** — link:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/account/password`

## 3. Create the database tables (migrations)

On your computer, in the project folder:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>     # the id in your project URL
npx supabase db push                              # applies everything in supabase/migrations/
```

Then in **SQL Editor** check the reminder job exists:

```sql
select jobname, schedule, command from cron.job;   -- expect nakshatra-payment-reminders, '30 3 * * *'
```

If it is missing (pg_cron was enabled after the push), run once:

```sql
select cron.schedule('nakshatra-payment-reminders', '30 3 * * *', 'select public.run_payment_reminders()');
```

`30 3 * * *` is 03:30 UTC = **09:00 IST**.

Also confirm the database time zone is India (the migration sets it):

```sql
show timezone;   -- Asia/Kolkata
```

## 4. Deploy the app on Vercel

1. <https://vercel.com/new> → import the GitHub repository. Framework: **Next.js**. Node.js **22**.
2. **Environment Variables** (Production):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://app.nakshatracdc.in` |
   | `SUPABASE_SECRET_KEY` | secret key — mark as **Sensitive** |
   | `CRON_SECRET` | optional: a long random string (enables the backup reminder endpoint) |

3. Deploy. Add your custom domain under **Settings → Domains** (HTTPS is automatic).
4. Optional backup trigger for reminders (only if you cannot use pg_cron): add a Vercel Cron Job calling
   `GET /api/cron/payment-reminders` daily; Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
   Running both is safe — a reminder is never sent twice.

> Never point a preview/staging deployment at the production database.

## 5. Create the first administrator

Sign-up is disabled, so create the first admin from your computer (password is asked, not typed on the command line):

```bash
# .env.production.local (never commit) containing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY
node --env-file=.env.production.local scripts/create-admin.mjs owner@nakshatracdc.in "Center Owner"
```

Sign in at your site. From then on, create all other accounts in the app (**User accounts**, or
**Parents → Create login**). Delete `.env.production.local` afterwards or keep it in a password manager.

## 6. First-day setup in the app

1. **Activity list**: add the activities and workouts your therapists use.
2. **Staff**: create each therapist's account (User accounts → Create account → role Staff).
3. **Students**: add each child, add the parents, assign therapists.
4. **Parents**: give each parent a login (parent page → Create login) and hand them the one-time password.
5. **Billing → Reminders**: check the reminder timings.

## 7. Production checklist

- [ ] Sign-up disabled; password rules set; SMTP configured; email templates updated (step 2)
- [ ] `select jobname from cron.job` shows the reminder job; `show timezone` is `Asia/Kolkata`
- [ ] Supabase **Advisors → Security** and **Performance**: no errors (RLS is on for every table)
- [ ] Paid plan with daily backups; consider Point-in-Time Recovery for children's records
- [ ] Secret key only in Vercel (Sensitive); nothing secret in Git
- [ ] Custom domain on HTTPS; `NEXT_PUBLIC_SITE_URL` matches it
- [ ] Privacy notice for parents (children's health data — India's DPDP Act requires verifiable parental consent)
- [ ] A second admin account exists (so one lost password never locks the center out)
- [ ] Staff who leave are **deactivated** the same day (User accounts → Deactivate)

## 8. Releasing changes later

1. Change code locally → `npm run check` and `npm run test:e2e` pass → push → GitHub Actions CI green.
2. If the change has a new migration: run `npx supabase db push` **before** the new code goes live, and make sure the
   migration works with the currently running code.
3. Merge to the production branch → Vercel deploys automatically.
4. Never edit a migration that is already applied to production — add a new one.

## 9. Backups and restore

- Supabase (paid plans) keeps daily backups: **Database → Backups**. Practise a restore into a new project once.
- Extra safety: a weekly dump from your computer (store it encrypted; it contains children's data):
  ```bash
  npx supabase db dump --linked -f schema-$(date +%F).sql              # structure
  npx supabase db dump --linked --data-only -f data-$(date +%F).sql   # data
  ```
