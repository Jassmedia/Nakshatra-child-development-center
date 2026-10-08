import { expect, test } from "@playwright/test";

import { login, runId, USERS } from "./helpers";

async function aaravUrls(page: import("@playwright/test").Page) {
  await login(page, USERS.admin);
  await page.goto("/admin/students?q=Aarav");
  await page.getByRole("link", { name: "Aarav Sharma" }).click();
  await page.waitForURL(/\/admin\/students\/[0-9a-f-]{36}$/);
  const admin = page.url();
  return {
    staff: admin.replace("/admin/students/", "/staff/students/") + "/home-tasks",
    parent: admin.replace("/admin/students/", "/parent/children/") + "/home-tasks",
  };
}

test.describe("Stage 6 — home assignments", () => {
  test("full cycle: assign, parent completes with comment, staff reviews", async ({ page }) => {
    const title = `Count 10 spoons ${runId()}`;
    const urls = await aaravUrls(page);

    // Therapist assigns.
    await login(page, USERS.speech);
    await page.goto(urls.staff);
    const form = page.locator("section", { hasText: "New home assignment" });
    await form.getByRole("textbox", { name: "Task" }).fill(title);
    await form.getByLabel("Instructions for the parent").fill("At lunch, count spoons together.");
    await form.getByRole("button", { name: "Assign to parents" }).click();
    await expect(page.getByText(`“${title}” assigned.`)).toBeVisible();

    // Parent sees it on home and completes it.
    await login(page, USERS.parentA);
    await expect(page.getByRole("link", { name: /to do/ }).first()).toBeVisible();
    await page.goto(urls.parent);
    const card = page.locator("article", { hasText: title });
    await expect(card.getByText("Pending")).toBeVisible();
    await card.getByLabel("How did it go? (optional)").fill("Counted to 8 by himself!");
    await card.getByRole("button", { name: "Mark as done" }).click();
    await expect(page.locator("article", { hasText: title }).getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.locator("article", { hasText: title }).getByText("Counted to 8 by himself!")).toBeVisible();

    // Therapist reviews from the work queue.
    await login(page, USERS.speech);
    await page.goto("/staff/home-tasks");
    const queued = page.locator("article", { hasText: title });
    await expect(queued).toBeVisible();
    await queued.getByLabel("Feedback for the parents").fill("Brilliant, try 10 next week.");
    await queued.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Marked as reviewed.")).toBeVisible();

    // Parent sees the feedback.
    await login(page, USERS.parentA);
    await page.goto(urls.parent);
    const done = page.locator("article", { hasText: title });
    await expect(done.getByText("Reviewed", { exact: true })).toBeVisible();
    await expect(done.getByText("Brilliant, try 10 next week.")).toBeVisible();
  });

  test("parent and therapist can talk in the comments", async ({ page }) => {
    const msg = `Can we use a spoon instead? ${runId()}`;
    const urls = await aaravUrls(page);
    await login(page, USERS.parentA);
    await page.goto(urls.parent);
    const card = page.locator("article").first();
    await card.getByText("Add a comment").click();
    await card.getByRole("textbox", { name: "Comment" }).fill(msg);
    await card.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText(msg)).toBeVisible();
    await login(page, USERS.speech);
    await page.goto(urls.staff);
    await expect(page.getByText(msg)).toBeVisible();
  });

  test("parents cannot create or review assignments", async ({ page }) => {
    const urls = await aaravUrls(page);
    await login(page, USERS.parentA);
    await page.goto(urls.parent);
    await expect(page.getByRole("button", { name: "Assign to parents" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save review" })).toHaveCount(0);
    // Another family cannot open this page.
    await login(page, USERS.parentB);
    const res = await page.goto(urls.parent);
    expect(res?.status()).toBe(404);
  });

  test("admin work queue lists overdue tasks", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/home-tasks?view=overdue");
    await expect(page.locator("article").getByText("Overdue").first()).toBeVisible();
  });
});
