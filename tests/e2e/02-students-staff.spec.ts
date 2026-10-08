import { expect, test } from "@playwright/test";

import { login, runId, USERS } from "./helpers";

test.describe("Stage 2 — students, parents, staff", () => {
  test.beforeEach(({ page }) => {
    page.on("dialog", (d) => d.accept());
  });

  test("admin searches students and opens a profile", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/students");
    await expect(page.getByRole("link", { name: "Aarav Sharma" })).toBeVisible();
    await page.getByLabel("Search").fill("zoya");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("link", { name: "Zoya Khan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aarav Sharma" })).toHaveCount(0);
    await page.getByRole("link", { name: "Zoya Khan" }).click();
    await expect(page.getByRole("heading", { name: "Zoya Khan" })).toBeVisible();
    await expect(page.getByText("Uses noise-cancelling headphones")).toBeVisible();
  });

  test("admin adds a student, links a new parent and assigns a therapist", async ({ page }) => {
    const name = `Test Child ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/students/new");
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Date of birth").fill("2020-05-05");
    await page.getByLabel("Diagnosis / condition").fill("Speech delay");
    await page.getByRole("button", { name: "Add student" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(/NCDC-\d{4}-\d{4}/)).toBeVisible();

    // New parent (the form is open because none is linked yet).
    const parentForm = page.locator("form", { has: page.getByRole("button", { name: "Add and link parent" }) });
    await parentForm.getByLabel("Full name").fill("Test Parent");
    await parentForm.getByLabel("Phone", { exact: true }).fill("+91 90000 11111");
    await parentForm.getByLabel("Primary contact for this child").check();
    await parentForm.getByRole("button", { name: "Add and link parent" }).click();
    await expect(page.getByRole("link", { name: "Test Parent" })).toBeVisible();
    await expect(page.getByText("Primary contact", { exact: true })).toBeVisible();

    // Therapist.
    await page.getByText("Assign a therapist", { exact: true }).click();
    await page.getByLabel("Therapist").selectOption({ label: "Meera Iyer, Speech Therapist" });
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.getByRole("link", { name: "Meera Iyer" })).toBeVisible();

    // Meera now sees the child; Rahul does not.
    await login(page, USERS.speech);
    await page.goto("/staff/students");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await login(page, USERS.ot);
    await page.goto("/staff/students");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  });

  test("validation: a parent needs a phone or an email", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/parents/new");
    await page.getByLabel("Full name").fill("No Contact");
    await page.getByRole("button", { name: "Add parent" }).click();
    await expect(page.getByText("Enter a phone number or an email")).toBeVisible();
  });

  test("ending an assignment removes the therapist's access immediately", async ({ page }) => {
    const name = `Access Child ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/students/new");
    await page.getByLabel("Full name").fill(name);
    await page.getByRole("button", { name: "Add student" }).click();
    await page.waitForURL(/\/admin\/students\/[0-9a-f-]{36}\?created=1$/);
    const adminUrl = page.url().replace("?created=1", "");
    await page.getByText("Assign a therapist", { exact: true }).click();
    await page.getByLabel("Therapist").selectOption({ label: "Meera Iyer, Speech Therapist" });
    await page.getByLabel("Starts on").fill("2025-01-01");
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.getByRole("link", { name: "Meera Iyer" })).toBeVisible();

    const staffUrl = adminUrl.replace("/admin/", "/staff/");
    await login(page, USERS.speech);
    await page.goto(staffUrl);
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await login(page, USERS.admin);
    await page.goto(adminUrl);
    await page.getByRole("button", { name: "End assignment" }).click();
    await expect(page.getByText("Past therapists")).toBeVisible();

    await login(page, USERS.speech);
    const res = await page.goto(staffUrl);
    expect(res?.status()).toBe(404);
  });

  test("staff cannot open a student they are not assigned to", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/students?q=Diya");
    await page.getByRole("link", { name: "Diya Sharma" }).click();
    await page.waitForURL(/\/admin\/students\/[0-9a-f-]{36}$/);
    const staffUrl = page.url().replace("/admin/", "/staff/");
    await login(page, USERS.speech); // Meera is not assigned to Diya
    const res = await page.goto(staffUrl);
    expect(res?.status()).toBe(404);
  });

  test("admin gives a parent a portal login", async ({ page }) => {
    await login(page, USERS.admin);
    // A fresh parent each run, linked to Kabir.
    const email = `parent-${runId()}@nakshatra.test`;
    await page.goto("/admin/parents/new");
    await page.getByLabel("Full name").fill("Portal Parent");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Add parent" }).click();
    await page.waitForURL(/\/admin\/parents\/[0-9a-f-]{36}$/);
    const loginPanel = page.locator("section", { hasText: "Parent portal login" });
    await loginPanel.getByRole("button", { name: "Create login" }).click();
    await expect(loginPanel.getByText("Login created")).toBeVisible();
    await expect(loginPanel.getByText("Signs in as")).toBeVisible();
    const message = await loginPanel.getByRole("status").innerText();
    const password = message.match(/Password: (\S+)\./)?.[1] ?? "";
    expect(password.length).toBeGreaterThan(8);
    await login(page, email, password);
    await expect(page).toHaveURL(/\/parent$/);
  });
});
