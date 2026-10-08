import { expect, test } from "@playwright/test";

import { expectNoHorizontalScroll, login, USERS } from "./helpers";

test.describe("Stages 10-11 — reports & admin dashboard", () => {
  test("admin dashboard shows the key numbers and recent updates", async ({ page }) => {
    await login(page, USERS.admin);
    for (const label of ["Students", "Today's activities", "Present today", "Pending payments"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Tasks for today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming activities (next 7 days)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Parent assignments" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Daily attendance rate/ })).toBeVisible();
    await expect(page.locator("section", { hasText: "Recent updates" }).locator("li").first()).toBeVisible();
  });

  test("every admin report renders and downloads as CSV", async ({ page }) => {
    await login(page, USERS.admin);
    const reports = ["attendance", "activities", "parent-tasks", "progress", "pending-assignments", "pending-payments", "payment-history"];
    for (const r of reports) {
      await page.goto(`/admin/reports?report=${r}&from=2026-01-01&to=2026-12-31`);
      await expect(page.locator("main table, main [class*=dashed]").first()).toBeVisible();
      const res = await page.request.get(`/admin/reports/export?report=${r}&from=2026-01-01&to=2026-12-31`);
      expect(res.status(), r).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/csv");
      expect((await res.text()).split("\r\n").length).toBeGreaterThan(1);
    }
  });

  test("student filter narrows the attendance report", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/reports?report=attendance");
    await page.getByLabel("Student").selectOption({ label: "Zoya Khan" });
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Zoya Khan");
  });

  test("staff reports are limited to their students and exclude billing", async ({ page }) => {
    await login(page, USERS.speech);
    await page.goto("/staff/reports?report=attendance&from=2026-01-01&to=2026-12-31");
    const body = await page.locator("tbody").innerText();
    expect(body).toContain("Aarav Sharma");
    expect(body).not.toContain("Diya Sharma");
    await expect(page.getByRole("link", { name: "Pending payments" })).toHaveCount(0);
    // Asking for a billing report falls back to attendance; the CSV never contains fees.
    await page.goto("/staff/reports?report=pending-payments");
    await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
    const csv = await (await page.request.get("/staff/reports/export?report=payment-history")).text();
    expect(csv).not.toContain("Receipt");
    // Staff cannot use the admin export.
    const res = await page.request.get("/admin/reports/export?report=payment-history");
    expect(res.status()).toBe(403);
  });

  test("dashboard and reports fit a phone @mobile", async ({ page }) => {
    await login(page, USERS.admin);
    await expectNoHorizontalScroll(page);
    await page.goto("/admin/reports");
    await expectNoHorizontalScroll(page);
  });
});
