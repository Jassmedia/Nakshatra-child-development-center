import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APP_ROLES, hasRole, isAppRole, ROLE_HOME } from "./roles";

describe("roles", () => {
  it("exposes exactly the three login roles (students have no login)", () => {
    expect([...APP_ROLES].sort()).toEqual(["admin", "parent", "staff"]);
  });

  it("matches the app_role enum defined in the SQL migrations (no drift)", () => {
    const dir = path.resolve(__dirname, "../../../supabase/migrations");
    const sql = readdirSync(dir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(path.join(dir, file), "utf8"))
      .join("\n");
    const match = sql.match(/create type public\.app_role as enum \(([^)]*)\)/i);
    expect(match).not.toBeNull();
    const sqlRoles = match![1].split(",").map((role) => role.trim().replace(/'/g, ""));
    expect([...APP_ROLES]).toEqual(sqlRoles);
  });

  it("has a home route for every role", () => {
    for (const role of APP_ROLES) expect(ROLE_HOME[role]).toMatch(/^\//);
  });

  it("isAppRole rejects anything that is not a known role", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("student")).toBe(false);
    expect(isAppRole("ADMIN")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(1)).toBe(false);
  });

  it("hasRole is false for anonymous users", () => {
    expect(hasRole(null, ["admin"])).toBe(false);
    expect(hasRole("staff", ["admin"])).toBe(false);
    expect(hasRole("staff", ["admin", "staff"])).toBe(true);
  });
});
