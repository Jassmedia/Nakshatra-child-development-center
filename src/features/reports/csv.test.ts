import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { toCsv } from "./queries";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines, adds totals and a BOM for Excel", () => {
    const csv = toCsv({
      columns: [{ key: "a", label: "Name" }, { key: "b", label: "Amount" }],
      rows: [{ a: 'Rao, "Anita"', b: 1500.5 }, { a: "line1\nline2", b: null }],
      totals: { a: "Total", b: 1500.5 },
    });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Rao, ""Anita"""');
    expect(csv).toContain('"line1\nline2",');
    expect(csv.trim().split("\r\n").at(-1)).toBe("Total,1500.5");
  });

  it("neutralises spreadsheet formulas (CSV injection)", () => {
    const csv = toCsv({ columns: [{ key: "a", label: "Remark" }], rows: [{ a: "=HYPERLINK(\"evil\")" }, { a: "-5" }] });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'-5");
  });
});
