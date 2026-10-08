import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase Auth emails (password reset, invitation).
 * Supports both the token_hash style (recommended email template) and the PKCE ?code= style.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? "/account/password";

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (ok) {
    url.pathname = next;
  } else {
    url.pathname = "/login";
    url.searchParams.set("error", "link");
  }
  return NextResponse.redirect(url);
}
