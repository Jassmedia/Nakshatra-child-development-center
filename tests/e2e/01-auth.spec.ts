import { expect, test } from "@playwright/test";

import { expectNoHorizontalScroll, login, PASSWORD, runId, USERS } from "./helpers";

test.describe("Stage 1 — authentication & roles", () => {
  test("anonymous visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password shows a clear error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(USERS.admin);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText("Email or password is incorrect.");
  });

  test("each role lands in its own area", async ({ page }) => {
    await login(page, USERS.admin);
    await expect(page).toHaveURL(/\/admin$/);
    await login(page, USERS.speech);
    await expect(page).toHaveURL(/\/staff$/);
    await login(page, USERS.parentA);
    await expect(page).toHaveURL(/\/parent$/);
  });

  test("wrong-role URLs redirect to the user's own area", async ({ page }) => {
    await login(page, USERS.speech);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/staff$/);
    await login(page, USERS.parentA);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/parent$/);
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/parent$/);
  });

  test("sign in honours ?next= but never leaves the site", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login?next=//evil.example.com");
    await page.getByLabel("Email").fill(USERS.admin);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/localhost:3100\/admin$/);
  });

  test("admin creates a staff account; deactivation locks it out", async ({ page }) => {
    const email = `e2e-staff-${runId()}@nakshatra.test`;
    await login(page, USERS.admin);
    await page.goto("/admin/users/new");
    await page.getByLabel("Full name").fill("E2E Therapist");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Role").selectOption("staff");
    await page.getByLabel("Designation").fill("Physiotherapist");
    await page.getByLabel("Starting password").fill("Start@1234");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText("Account created");

    // New staff can sign in and lands in /staff.
    await login(page, email, "Start@1234");
    await expect(page).toHaveURL(/\/staff$/);

    // Admin deactivates.
    await login(page, USERS.admin);
    await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
    await page.getByRole("link", { name: "E2E Therapist" }).click();
    await page.getByRole("button", { name: "Deactivate account" }).click();
    await expect(page.getByRole("status")).toContainText("Account deactivated");

    // Sign-in now fails.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Start@1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("validation errors are shown next to fields", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/users/new");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Starting password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  });

  test("user edits own details and signs out", async ({ page }) => {
    await login(page, USERS.parentB);
    await page.goto("/account");
    await page.getByLabel("Phone").fill("+91 98450 29999");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByRole("status")).toHaveText("Your details are saved.");
    await page.getByRole("button", { name: "Sign out" }).first().click({ force: true });
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login/);
  });

  test("phone layout: menu opens and nothing scrolls sideways @mobile", async ({ page }) => {
    await login(page, USERS.admin);
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "User accounts" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.locator("#mobile-nav")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });
});
