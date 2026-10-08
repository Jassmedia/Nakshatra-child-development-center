import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo@12345";

export const USERS = {
  admin: "admin@nakshatra.test",
  speech: "meera@nakshatra.test",
  ot: "rahul@nakshatra.test",
  parentA: "priya@nakshatra.test",
  parentB: "imran@nakshatra.test",
} as const;

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

/** Unique suffix so tests can be re-run against the same database. */
export const runId = () => Date.now().toString(36);
