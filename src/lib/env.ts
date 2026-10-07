import { z } from "zod";

/**
 * PUBLIC environment variables — safe to ship to the browser.
 *
 * Next.js only inlines NEXT_PUBLIC_* values into client bundles when they are
 * referenced literally (process.env.NEXT_PUBLIC_X), so each one is listed by
 * name below. Do not refactor this into a dynamic lookup.
 *
 * Server-only secrets live in ./env.server.ts and must never be imported here.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Invalid or missing public environment variables: ${missing}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return result.data;
}

let cached: PublicEnv | undefined;

/** Validated public env. Parsed lazily so `next build` works before env is configured. */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return cached;
}
