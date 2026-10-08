import { AppShell } from "@/components/app-shell/app-shell";
import { requireRole } from "@/lib/auth/session";

// Server-side guard for the whole /staff area. RLS in the database is the second, real guard.
export default async function Layout({ children }: LayoutProps<"/staff">) {
  const user = await requireRole("staff");
  return <AppShell user={user}>{children}</AppShell>;
}
