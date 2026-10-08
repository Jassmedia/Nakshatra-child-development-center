import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/common";

/** Marks one notification as read, then goes to the page it points to. */
export async function GET(request: NextRequest, { params }: RouteContext<"/notifications/open/[id]">) {
  const { id } = await params;
  const url = request.nextUrl.clone();
  url.search = "";
  const user = await getCurrentUser();
  if (!user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (!uuidSchema.safeParse(id).success) {
    url.pathname = "/notifications";
    return NextResponse.redirect(url);
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("link")
    .maybeSingle();
  // Links are stored by the database and always start with a single "/": safe to follow.
  const link = data?.link;
  url.pathname = link && link.startsWith("/") && !link.startsWith("//") ? link : "/notifications";
  return NextResponse.redirect(url);
}
