import "server-only";

import { z } from "zod";

/**
 * SERVER-ONLY secrets. The `server-only` import above makes the build FAIL if
 * a Client Component ever imports this file, so the secret key can never be
 * bundled into browser JavaScript by accident.
 */
const serverEnvSchema = z.object({
  // Bypasses Row Level Security. Only for trusted server code (e.g. Admin creating user accounts).
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const result = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  if (!result.success) {
    throw new Error("Missing server environment variable SUPABASE_SECRET_KEY. See .env.example.");
  }
  cached = result.data;
  return cached;
}
