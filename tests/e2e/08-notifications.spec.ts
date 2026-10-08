import { expect, test } from "@playwright/test";

import { login, runId, USERS } from "./helpers";

test.describe("Stages 8-9 — notifications & reminders", () => {
  test("parent is notified of a therapist's update and can open it", async ({ page }) => {
    const remark = `Great session today ${runId()}`;
    // Clear the parent's inbox first.
    await login(page, USERS.parentA);
    await page.goto("/notifications");
    const markAll = page.getByRole("button", { name: "Mark all as read" });
    if (await markAll.count()) {
      await markAll.click();
      await expect(page.getByText("You're all caught up.")).toBeVisible();
    }

    // Therapist records an outcome for Aarav.
    await login(page, USERS.speech);
    const card = page.locator("article", { hasText: "Aarav Sharma" }).first();
    await card.getByText(/Record outcome|Edit outcome/).click();
    await card.locator("form").getByText("Completed", { exact: true }).click();
    await card.getByLabel(/Remarks for the record/).fill(remark);
    await card.getByRole("button", { name: "Save outcome" }).click();
    await expect(page.locator("blockquote", { hasText: remark })).toBeVisible();

    // Parent sees the unread badge and the notification.
    await login(page, USERS.parentA);
    await expect(page.getByRole("link", { name: /Notifications, \d+ unread/ }).first()).toBeVisible();
    await page.goto("/notifications");
    const item = page.getByRole("link", { name: new RegExp(remark) });
    await expect(item).toBeVisible();
    await item.click();
    await page.waitForURL(/\/parent\/children\/[0-9a-f-]{36}\/activities$/);
    await expect(page.locator("blockquote", { hasText: remark })).toBeVisible();
  });

  test("therapist is notified when a parent completes a home task", async ({ page }) => {
    const title = `Sort colours ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/students?q=Aarav");
    await page.getByRole("link", { name: "Aarav Sharma" }).click();
    await page.waitForURL(/\/admin\/students\/[0-9a-f-]{36}$/);
    const base = page.url();
    await page.goto(`${base}/home-tasks`);
    await page.getByRole("textbox", { name: "Task" }).fill(title);
    await page.getByRole("button", { name: "Assign to parents" }).click();
    await expect(page.locator("article", { hasText: title })).toBeVisible();

    await login(page, USERS.parentA);
    await page.goto(base.replace("/admin/students/", "/parent/children/") + "/home-tasks");
    await page.locator("article", { hasText: title }).getByRole("button", { name: "Mark as done" }).click();
    await expect(page.locator("article", { hasText: title }).getByText("Completed", { exact: true })).toBeVisible();

    await login(page, USERS.speech);
    await page.goto("/notifications");
    await expect(page.getByRole("link", { name: new RegExp(`Home task done: ${title}`) })).toBeVisible();
  });

  test("admin configures and runs payment reminders", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/billing/reminders");
    await page.getByLabel("Remind this many days before the due date").fill("5");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Reminder settings saved.")).toBeVisible();
    await page.getByRole("button", { name: "Send due reminders now" }).click();
    await expect(page.getByText(/reminders? sent\.|No reminders were due today/)).toBeVisible();
    await expect(page.getByRole("cell", { name: /Overdue|Before due date|On due date/ }).first()).toBeVisible();
    // Second run sends nothing new.
    await page.getByRole("button", { name: "Send due reminders now" }).click();
    await expect(page.getByText("No reminders were due today. Nothing was sent twice.")).toBeVisible();

    // The parent of a child with an overdue fee received an in-app reminder.
    await login(page, USERS.parentA);
    await page.goto("/notifications");
    await expect(page.getByRole("link", { name: /Payment (reminder|due today|overdue)/ }).first()).toBeVisible();
  });

  test("viewing the inbox does not mark notifications as read", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/billing/reminders");
    // Create a fresh unread notification for parent A via a new fee.
    await page.goto("/admin/billing/new");
    const aarav = await page.getByLabel("Student", { exact: true }).locator("option", { hasText: "Aarav Sharma" }).getAttribute("value");
    await page.getByLabel("Student", { exact: true }).selectOption(aarav!);
    await page.getByLabel("Description").fill(`Inbox check ${runId()}`);
    await page.getByLabel("Amount (₹)").fill("10");
    await page.getByRole("button", { name: "Create fee" }).click();
    await page.waitForURL(/\/admin\/billing\/[0-9a-f-]{36}$/);

    await login(page, USERS.parentA);
    await page.goto("/notifications");
    await page.waitForTimeout(1500); // give any prefetching time to happen
    await page.reload();
    await expect(page.getByText(/\d+ unread/)).toBeVisible();
  });

  test("staff cannot open reminder settings", async ({ page }) => {
    await login(page, USERS.speech);
    await page.goto("/admin/billing/reminders");
    await expect(page).toHaveURL(/\/staff$/);
  });

  test("cron endpoint rejects requests without the secret", async ({ request }) => {
    const res = await request.get("/api/cron/payment-reminders");
    expect([401, 404]).toContain(res.status());
    const bad = await request.get("/api/cron/payment-reminders", { headers: { authorization: "Bearer wrong" } });
    expect([401, 404]).toContain(bad.status());
  });
});
