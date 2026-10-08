import { expect, test } from "@playwright/test";

import { login, runId, USERS } from "./helpers";

test.describe("Stage 7 — billing", () => {
  test("create a fee, part-pay with paise, pay the rest, void, receipt", async ({ page }) => {
    const title = `Speech package ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/billing/new");
    const zoya = await page.getByLabel("Student", { exact: true }).locator("option", { hasText: "Zoya Khan" }).getAttribute("value");
    await page.getByLabel("Student", { exact: true }).selectOption(zoya!);
    await page.getByLabel("Description").fill(title);
    await page.getByLabel("Amount (₹)").fill("3,000");
    await page.getByLabel("Discount (₹)").fill("250.25");
    await page.getByRole("button", { name: "Create fee" }).click();
    await page.waitForURL(/\/admin\/billing\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("₹2,749.75").first()).toBeVisible();

    // Part payment with paise.
    const pay = page.locator("section", { hasText: "Record a payment" });
    await pay.getByLabel("Amount (₹)").fill("1000.50");
    await pay.getByLabel("Method").selectOption("cash");
    await pay.getByLabel("Payment remarks").fill("First instalment");
    await pay.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Payment of ₹1000.50 recorded.")).toBeVisible();
    await expect(page.getByText("Partially paid").first()).toBeVisible();
    await expect(page.getByText("₹1,749.25").first()).toBeVisible();

    // Overpayment is refused with a clear message.
    await pay.getByLabel("Amount (₹)").fill("5000");
    await pay.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText(/more than the balance due/).first()).toBeVisible();

    // Pay the rest.
    await pay.getByLabel("Amount (₹)").fill("1749.25");
    await pay.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

    // Void the first payment: back to partially paid.
    const firstRow = page.locator("tr", { hasText: "First instalment" });
    await firstRow.getByText("Void", { exact: true }).click();
    await firstRow.getByLabel("Reason").fill("Recorded on wrong fee");
    await firstRow.getByRole("button", { name: "Void payment" }).click();
    await expect(page.getByText("Voided: Recorded on wrong fee")).toBeVisible();
    await expect(page.getByText("Partially paid").first()).toBeVisible();

    // Receipt for the valid payment.
    await page.getByRole("link", { name: /^RCPT-/ }).first().click();
    await expect(page.getByText("Payment receipt")).toBeVisible();
    await expect(page.getByText("₹1,749.25")).toBeVisible();
  });

  test("validation: amount format and discount", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/billing/new");
    await page.getByLabel("Amount (₹)").fill("12.345");
    await page.getByRole("button", { name: "Create fee" }).click();
    await expect(page.getByText(/enter rupees/)).toBeVisible();
    await expect(page.getByText(/Choose a student/)).toBeVisible();
  });

  test("parents see their own fees and receipts; staff see no billing", async ({ page }) => {
    await login(page, USERS.parentA);
    await expect(page.getByRole("link", { name: /₹5,500\.00 due by|overdue/ }).first()).toBeVisible();
    await page.getByRole("link", { name: "Open Aarav's record" }).click();
    await page.getByRole("link", { name: "Fees", exact: true }).click();
    await expect(page.getByText("Pending amount")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0);
    await page.getByRole("link", { name: /^Receipt RCPT-/ }).first().click();
    await expect(page.getByText("Payment receipt")).toBeVisible();
    const receiptUrl = page.url();

    // Another family cannot open that receipt.
    await login(page, USERS.parentB);
    const res = await page.goto(receiptUrl);
    expect(res?.status()).toBe(404);

    // Staff: no Fees tab, no billing pages.
    await login(page, USERS.speech);
    await page.goto("/staff/students");
    await page.getByRole("link", { name: /Aarav Sharma/ }).click();
    await expect(page.getByRole("link", { name: "Fees", exact: true })).toHaveCount(0);
    await page.goto("/admin/billing");
    await expect(page).toHaveURL(/\/staff$/);
  });

  test("bulk fee for all active students", async ({ page }) => {
    const title = `Annual materials ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/billing/new");
    await page.getByLabel("Create this fee for ALL active students instead").check();
    await page.getByLabel("Description").fill(title);
    await page.getByLabel("Amount (₹)").fill("500");
    await page.getByRole("button", { name: "Create fee" }).click();
    await expect(page.getByText(/Fee created for \d+ students/)).toBeVisible();
    await page.goto(`/admin/billing?status=&q=${encodeURIComponent(title)}`);
    expect(await page.locator("tbody tr").count()).toBeGreaterThanOrEqual(4);
  });
});
