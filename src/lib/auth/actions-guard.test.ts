import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Server Actions are public HTTP endpoints. Every exported action must check who is
 * calling (requireRole / getCurrentUser) before doing anything. This scans the code
 * so a new action without a check fails the test suite.
 */
const PUBLIC_ACTIONS = new Set(["signIn", "signOut", "requestPasswordReset"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

describe("server actions", () => {
  const src = path.resolve(__dirname, "../..");
  const actionFiles = files(src).filter((f) => /^\s*["']use server["'];/m.test(readFileSync(f, "utf8")));

  it("finds the action files", () => {
    expect(actionFiles.length).toBeGreaterThan(8);
  });

  for (const file of actionFiles) {
    const code = readFileSync(file, "utf8");
    const exported = [...code.matchAll(/export async function (\w+)\s*\(/g)];
    for (const match of exported) {
      const name = match[1];
      if (PUBLIC_ACTIONS.has(name)) continue;
      it(`${path.relative(src, file)} → ${name}() checks the caller first`, () => {
        const body = code.slice(match.index!, code.indexOf("\n}\n", match.index!));
        const firstStatement = body.split("\n").slice(1).find((l) => l.trim() && !l.trim().startsWith("//")) ?? "";
        expect(firstStatement).toMatch(/await (requireRole|getCurrentUser)\(/);
      });
    }
  }
});
