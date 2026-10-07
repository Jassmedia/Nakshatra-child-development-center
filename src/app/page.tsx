import { APP_ROLES, ROLE_LABEL } from "@/lib/auth/roles";

// Public landing page. Static: it reads no session, so it prerenders.
// Sign-in and the role-specific portals arrive in Step 2 onwards.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          Student &amp; Parent Management System
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Nakshatra Child Development Center
        </h1>
        <p className="max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">
          A secure place for the center, its therapists and parents to follow each child&apos;s
          activities, attendance, progress and home assignments.
        </p>
      </header>

      <section aria-labelledby="who-signs-in" className="flex flex-col gap-3">
        <h2 id="who-signs-in" className="text-lg font-semibold">
          Who signs in
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {APP_ROLES.map((role) => (
            <li
              key={role}
              className="rounded-lg border border-zinc-200 bg-white p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900"
            >
              {ROLE_LABEL[role]}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        System foundation is in place. Sign-in becomes available in the next release.
      </p>
    </main>
  );
}
