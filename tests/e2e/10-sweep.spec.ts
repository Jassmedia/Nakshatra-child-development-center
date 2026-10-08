import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalScroll, login, USERS } from "./helpers";

/**
 * Stage 12 sweep: every main page for every role, on a phone.
 * Checks: loads OK, nothing scrolls sideways, no browser console errors, server answers fast.
 */
async function studentBase(page: Page, area: "admin" | "staff" | "parent") {
  if (area === "parent") {
    await page.goto("/parent");
    await page.getByRole("link", { name: /Open .*record/ }).first().click();
    await page.waitForURL(/\/parent\/children\/[0-9a-f-]{36}$/);
  } else {
    await page.goto(`/${area}/students`);
    await page.locator(`main a[href^="/${area}/students/"]:not([href$="/new"])`).first().click();
    await page.waitForURL(new RegExp(`/${area}/students/[0-9a-f-]{36}$`));
  }
  return new URL(page.url()).pathname;
}

const ROLES = {
  admin: {
    user: USERS.admin,
    pages: ["/admin", "/admin/students", "/admin/students/new", "/admin/activities", "/admin/activities/catalogue", "/admin/attendance", "/admin/progress", "/admin/home-tasks", "/admin/billing", "/admin/billing/new", "/admin/billing/reminders", "/admin/reports", "/admin/parents", "/admin/staff", "/admin/users", "/admin/users/new", "/notifications", "/account"],
    tabs: ["", "/activities", "/attendance", "/progress", "/home-tasks", "/fees"],
  },
  staff: {
    user: USERS.speech,
    pages: ["/staff", "/staff/students", "/staff/attendance", "/staff/home-tasks", "/staff/reports", "/notifications", "/account"],
    tabs: ["", "/activities", "/attendance", "/progress", "/home-tasks"],
  },
  parent: {
    user: USERS.parentA,
    pages: ["/parent", "/notifications", "/account"],
    tabs: ["", "/activities", "/attendance", "/progress", "/home-tasks", "/fees"],
  },
} as const;

for (const [area, cfg] of Object.entries(ROLES) as Array<[keyof typeof ROLES, (typeof ROLES)[keyof typeof ROLES]]>) {
  test(`${area}: every page works on a phone @mobile`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`);
    });
    await login(page, cfg.user);
    const base = await studentBase(page, area);
    const urls = [...cfg.pages, ...cfg.tabs.map((t) => base + t)];
    for (const url of urls) {
      const started = Date.now();
      const res = await page.goto(url);
      const ms = Date.now() - started;
      expect(res?.status(), url).toBe(200);
      expect(ms, `${url} took ${ms}ms`).toBeLessThan(3000);
      await expect(page.locator("h1").first(), url).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
    expect(errors).toEqual([]);
  });
}

test("unknown pages show the friendly not-found page", async ({ page }) => {
  await login(page, USERS.admin);
  const res = await page.goto("/admin/students/not-a-real-id");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
