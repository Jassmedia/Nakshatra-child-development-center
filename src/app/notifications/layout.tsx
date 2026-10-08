import { AppShell } from "@/components/app-shell/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function Layout({ children }: LayoutProps<"/notifications">) {
  const user = await requireRole("admin", "staff", "parent");
  return <AppShell user={user}>{children}</AppShell>;
}
