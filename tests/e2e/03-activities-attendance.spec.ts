import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalScroll, login, runId, USERS } from "./helpers";

async function openStudent(page: Page, area: "admin" | "staff", name: string) {
  if (area === "admin") {
    await page.goto(`/admin/students?q=${encodeURIComponent(name)}`);
  } else {
    await page.goto("/staff/students");
  }
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await page.waitForURL(new RegExp(`/${area}/students/[0-9a-f-]{36}$`));
  return page.url();
}

test.describe("Stage 3 — activities & attendance", () => {
  test("therapist marks today's attendance from the Today page", async ({ page }) => {
    await login(page, USERS.speech);
    await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
    const row = page.locator("li", { hasText: "Aarav Sharma" }).first();
    await row.getByText("Present", { exact: true }).click();
    await row.locator('input[name^="in:"]').fill("09:40");
    await page.getByRole("button", { name: "Save attendance" }).click();
    await expect(page.getByText(/Attendance saved for/)).toBeVisible();
    await page.reload();
    await expect(page.locator("li", { hasText: "Aarav Sharma" }).first().getByText("Marked")).toBeVisible();
    // Only Meera's own students are in her register.
    await expect(page.locator("li", { hasText: "Diya Sharma" })).toHaveCount(0);
  });

  test("register rejects check-out before check-in", async ({ page }) => {
    await login(page, USERS.ot);
    await page.goto("/staff/attendance?date=2026-01-05");
    const row = page.locator("li", { hasText: "Diya Sharma" }).first();
    await row.getByText("Present", { exact: true }).click();
    await row.locator('input[name^="in:"]').fill("11:00");
    await row.locator('input[name^="out:"]').fill("10:00");
    await page.getByRole("button", { name: "Save attendance" }).click();
    await expect(page.getByText("Check-out must be after check-in")).toBeVisible();
  });

  test("therapist records an activity outcome with remarks", async ({ page }) => {
    await login(page, USERS.speech);
    const card = page.locator("article", { hasText: "Aarav Sharma" }).filter({ hasText: "Picture naming" }).first();
    await card.getByText(/Record outcome|Edit outcome/).click();
    const form = card.locator("form");
    await form.getByText("Partly done", { exact: true }).click();
    await form.getByText("4", { exact: true }).click();
    const remark = `Named 7 of 10 pictures ${runId()}`;
    await card.getByLabel(/Remarks for the record/).fill(remark);
    await card.getByRole("button", { name: "Save outcome" }).click();
    await expect(page.locator("blockquote", { hasText: remark })).toBeVisible();

    // Admin sees it in the daily schedule.
    await login(page, USERS.admin);
    await page.goto("/admin/activities");
    await expect(page.locator("blockquote", { hasText: remark })).toBeVisible();
  });

  test("therapist schedules a repeating workout", async ({ page }) => {
    await login(page, USERS.speech);
    const url = await openStudent(page, "staff", "Zoya Khan");
    await page.goto(`${url}/activities`);
    await page.getByLabel("From the activity list").selectOption({ label: "Animal walks" });
    await page.getByLabel("Repeat for how many days").fill("3");
    await page.getByRole("button", { name: "Schedule" }).click();
    await expect(page.getByText("“Animal walks” scheduled on 3 days.")).toBeVisible();
  });

  test("schedule form needs a name", async ({ page }) => {
    await login(page, USERS.speech);
    const url = await openStudent(page, "staff", "Zoya Khan");
    await page.goto(`${url}/activities`);
    await page.getByRole("button", { name: "Schedule" }).click();
    await expect(page.getByText("Choose from the list or type a name")).toBeVisible();
  });

  test("admin adds to the activity list; therapists can pick it", async ({ page }) => {
    const name = `Balance beam ${runId()}`;
    await login(page, USERS.admin);
    await page.goto("/admin/activities/catalogue");
    const add = page.locator("section", { hasText: "Add to the list" });
    await add.getByLabel("Name").fill(name);
    await add.getByLabel("Type").selectOption("workout");
    await add.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Activity added to the list.")).toBeVisible();

    await login(page, USERS.ot);
    const url = await openStudent(page, "staff", "Kabir Nair");
    await page.goto(`${url}/activities`);
    await expect(page.getByLabel("From the activity list").locator("option", { hasText: name })).toHaveCount(1);
  });

  test("admin register shows every active child; student attendance tab shows the month", async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto("/admin/attendance");
    for (const n of ["Aarav Sharma", "Diya Sharma", "Zoya Khan", "Kabir Nair"]) {
      await expect(page.locator("li", { hasText: n }).first()).toBeVisible();
    }
    const url = await openStudent(page, "admin", "Kabir Nair");
    await page.goto(`${url}/attendance`);
    await expect(page.getByText("Attendance rate")).toBeVisible();
    await expect(page.getByRole("cell", { name: /Present|Late|Absent|On leave/ }).first()).toBeVisible();
  });

  test("today page works on a phone @mobile", async ({ page }) => {
    await login(page, USERS.speech);
    await expect(page.getByRole("button", { name: "Save attendance" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
