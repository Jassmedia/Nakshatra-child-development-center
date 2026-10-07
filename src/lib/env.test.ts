import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parsePublicEnv", () => {
  it("accepts a complete configuration", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("names the missing variables in the error", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("never includes server secrets in the public env object", () => {
    const parsed = parsePublicEnv({ ...valid, SUPABASE_SECRET_KEY: "sb_secret_should_not_leak" });
    expect(Object.keys(parsed)).not.toContain("SUPABASE_SECRET_KEY");
  });
});
