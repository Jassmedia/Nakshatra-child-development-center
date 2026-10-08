import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchAll } from "./fetch-all";

describe("fetchAll", () => {
  it("keeps requesting pages until a short page arrives", async () => {
    const all = Array.from({ length: 2501 }, (_, i) => i);
    const calls: Array<[number, number]> = [];
    const rows = await fetchAll(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2501);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("stops after one call for small results and throws on errors", async () => {
    await expect(fetchAll(async () => ({ data: [1, 2], error: null }))).resolves.toEqual([1, 2]);
    await expect(fetchAll(async () => ({ data: null, error: { message: "x" } }))).rejects.toThrow();
  });
});
