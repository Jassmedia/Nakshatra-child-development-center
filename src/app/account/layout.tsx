import { AppShell } from "@/components/app-shell/app-shell";
import { requireRole } from "@/lib/auth/session";

// "My account" is available to every role.
export default async function Layout({ children }: LayoutProps<"/account">) {
  const user = await requireRole("admin", "staff", "parent");
  return <AppShell user={user}>{children}</AppShell>;
}
