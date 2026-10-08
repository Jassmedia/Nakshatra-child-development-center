import { expect, test, type Page } from "@playwright/test";

import { login, runId, USERS } from "./helpers";

async function staffStudentTab(page: Page, name: string, tab: string) {
  await page.goto("/staff/students");
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await page.waitForURL(/\/staff\/students\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: tab, exact: true }).click();
  await page.waitForURL(new RegExp(`/${tab.toLowerCase()}`));
}

test.describe("Stage 4 — progress", () => {
  test("therapist adds a progress update; it appears in the history and area card", async ({ page }) => {
    const note = `Follows 2-step instructions ${runId()}`;
    await login(page, USERS.speech);
    await staffStudentTab(page, "Aarav Sharma", "Progress");
    const form = page.locator("section", { hasText: "New progress update" });
    await form.getByRole("combobox", { name: "Area", exact: true }).selectOption("Cognitive");
    await form.locator("form").getByText("4", { exact: true }).click();
    await form.locator("form").getByText("Improving", { exact: true }).click();
    await form.getByLabel("Observations").fill(note);
    await form.getByLabel("Areas requiring attention").fill("Attention span after lunch");
    await form.getByRole("button", { name: "Add progress update" }).click();
    await expect(page.getByText("Progress update added.")).toBeVisible();
    await expect(page.locator("article", { hasText: note })).toBeVisible();
    await expect(page.locator("li", { hasText: "Cognitive" }).getByText("Improving")).toBeVisible();
  });

  test("area card filters the history and shows a level chart", async ({ page }) => {
    await login(page, USERS.speech);
    await staffStudentTab(page, "Aarav Sharma", "Progress");
    await page.locator("li", { hasText: "Speech & language" }).getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Speech & language history" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Speech & language: level over time/ })).toBeVisible();
    const articles = page.locator("article");
    const count = await articles.count();
    for (let i = 0; i < count; i++) await expect(articles.nth(i)).toContainText("Speech & language");
  });

  test("observations are required", async ({ page }) => {
    await login(page, USERS.ot);
    await staffStudentTab(page, "Diya Sharma", "Progress");
    await page.getByRole("button", { name: "Add progress update" }).click();
    await expect(page.getByText("Observations is required")).toBeVisible();
  });

  test("admin overview lists areas needing attention", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/progress");
    const panel = page.locator("section", { hasText: "Currently needing attention" });
    await expect(panel.getByRole("link", { name: "Zoya Khan" })).toBeVisible();
    await page.getByLabel("Trend").selectOption("improving");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("cell", { name: "Improving" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Needs attention" })).toHaveCount(0);
  });
});
