import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

// The app has no public pages: send people to their area, or to sign in.
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
