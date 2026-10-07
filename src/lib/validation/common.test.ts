import { describe, expect, it } from "vitest";

import { emailSchema, isoDateSchema, optionalText, phoneSchema, requiredText } from "./common";

describe("phoneSchema (mirrors the database CHECK constraint)", () => {
  it.each(["+91 98765 43210", "9876543210", "(080) 2345-6789"])("accepts %s", (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(true);
  });

  it.each(["", "12345", "abc-defg-hij", "+91 98765 43210 ext 5"])("rejects %s", (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("normalises case and whitespace", () => {
    expect(emailSchema.parse("  Parent@Example.COM ")).toBe("parent@example.com");
  });
  it("rejects invalid addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("text helpers", () => {
  it("requiredText trims and enforces length", () => {
    const name = requiredText(5, "Name");
    expect(name.parse("  Asha ")).toBe("Asha");
    expect(name.safeParse("   ").success).toBe(false);
    expect(name.safeParse("Too long").success).toBe(false);
  });

  it("optionalText turns empty form input into null", () => {
    expect(optionalText(10).parse("")).toBeNull();
    expect(optionalText(10).parse(" note ")).toBe("note");
  });
});

describe("isoDateSchema", () => {
  it("accepts YYYY-MM-DD and rejects other formats", () => {
    expect(isoDateSchema.safeParse("2026-10-07").success).toBe(true);
    expect(isoDateSchema.safeParse("07/10/2026").success).toBe(false);
  });
});
