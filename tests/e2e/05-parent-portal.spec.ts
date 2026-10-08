import { expect, test } from "@playwright/test";

import { expectNoHorizontalScroll, login, runId, USERS } from "./helpers";

async function childUrl(page: import("@playwright/test").Page, name: string) {
  await login(page, USERS.admin);
  await page.goto(`/admin/students?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/admin\/students\/[0-9a-f-]{36}$/);
  return page.url().replace("/admin/students/", "/parent/children/");
}

test.describe("Stage 5 — parent portal", () => {
  test("a parent sees exactly their own children", async ({ page }) => {
    await login(page, USERS.parentA);
    await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Diya Sharma" })).toBeVisible();
    await expect(page.getByText("Zoya Khan")).toHaveCount(0);

    await login(page, USERS.parentB);
    await expect(page.getByRole("heading", { name: "Zoya Khan" })).toBeVisible();
    await expect(page.getByText("Aarav Sharma")).toHaveCount(0);
  });

  test("another family's child URL is a 404 for every tab", async ({ page }) => {
    const zoya = await childUrl(page, "Zoya Khan");
    await login(page, USERS.parentA);
    for (const tab of ["", "/activities", "/attendance", "/progress"]) {
      const res = await page.goto(zoya + tab);
      expect(res?.status(), `tab ${tab || "overview"}`).toBe(404);
    }
  });

  test("overview shows therapist names but no staff contact details", async ({ page }) => {
    const aarav = await childUrl(page, "Aarav Sharma");
    await login(page, USERS.parentA);
    await page.goto(aarav);
    await expect(page.getByText("Meera Iyer")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("meera@nakshatra.test");
    expect(html).not.toContain("98450 10002");
  });

  test("activities are read-only and show who wrote the remark", async ({ page }) => {
    const aarav = await childUrl(page, "Aarav Sharma");
    await login(page, USERS.parentA);
    await page.goto(`${aarav}/activities`);
    await expect(page.locator("blockquote footer", { hasText: "Meera Iyer" }).first()).toBeVisible();
    await expect(page.getByText(/Record outcome|Edit outcome/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Schedule" })).toHaveCount(0);
  });

  test("internal progress notes stay hidden from parents", async ({ page }) => {
    const secret = `Internal only ${runId()}`;
    const shared = `Shared note ${runId()}`;
    const aarav = await childUrl(page, "Aarav Sharma");
    await login(page, USERS.speech);
    const staffProgress = aarav.replace("/parent/children/", "/staff/students/") + "/progress";
    for (const [text, share] of [[secret, false], [shared, true]] as const) {
      await page.goto(staffProgress);
      const form = page.locator("section", { hasText: "New progress update" });
      await form.getByLabel("Observations").fill(text);
      if (!share) await form.getByLabel("Share this update with the parents").uncheck();
      await form.getByRole("button", { name: "Add progress update" }).click();
      await expect(page.getByText("Progress update added.")).toBeVisible();
    }
    await login(page, USERS.parentA);
    await page.goto(`${aarav}/progress`);
    await expect(page.getByText(shared)).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add progress update" })).toHaveCount(0);
  });

  test("parent sees attendance history for their child", async ({ page }) => {
    const diya = await childUrl(page, "Diya Sharma");
    await login(page, USERS.parentA);
    await page.goto(`${diya}/attendance`);
    await expect(page.getByText("Attendance rate")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save attendance" })).toHaveCount(0);
  });

  test("parent home works on a phone @mobile", async ({ page }) => {
    await login(page, USERS.parentA);
    await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("link", { name: "Open Aarav's record" }).click();
    await page.getByRole("link", { name: "Progress", exact: true }).click();
    await expect(page.getByRole("heading", { name: "By area" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
