import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Optional backup trigger for the daily payment reminders, for hosts with a cron
 * feature (e.g. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
 * The database job is idempotent, so running this AND pg_cron is safe.
 * Disabled (404) unless CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Runs as the system (no user), which the function allows.
  const { data, error } = await createAdminClient().rpc("run_payment_reminders", {});
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ sent: data });
}
