import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: real browser, real app, real Supabase (local).
 * Prerequisites: a local Supabase with migrations applied, demo data seeded
 * (`npm run seed:demo`), and .env.local pointing at it.
 * Run: npm run test:e2e   (starts `next start` on port 3100 after `npm run build`)
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next start -p 3100", url: "http://localhost:3100/login", reuseExistingServer: true, timeout: 60_000 },
});
