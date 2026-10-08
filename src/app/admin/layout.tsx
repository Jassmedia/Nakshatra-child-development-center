import { AppShell } from "@/components/app-shell/app-shell";
import { requireRole } from "@/lib/auth/session";

// Server-side guard for the whole /admin area. RLS in the database is the second, real guard.
export default async function Layout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  return <AppShell user={user}>{children}</AppShell>;
}
