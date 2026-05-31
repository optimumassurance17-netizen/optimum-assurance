import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadEnv } from "dotenv"
import { defineConfig, devices } from "@playwright/test"

// Charge .env / .env.local / .env.e2e (si présent) pour E2E_ADMIN_* — jamais exposé au navigateur
loadEnv({ path: resolve(process.cwd(), ".env") })
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })
const envE2ePath = resolve(process.cwd(), ".env.e2e")
if (existsSync(envE2ePath)) {
  loadEnv({ path: envE2ePath, override: true })
}

/** GitHub Actions : après `npm run build`, lancer l’app avec `next start` (voir workflow CI). */
const useProductionServer = process.env.PLAYWRIGHT_USE_BUILD_SERVER === "1"
const resolvedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || (useProductionServer ? "http://127.0.0.1:3000" : "http://localhost:3000")

// Les parcours E2E interrogent des routes NextAuth ; on injecte un secret de secours
// pour éviter les faux négatifs en environnement de test local ou cloud.
if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = "playwright-e2e-secret-32-chars-min"
}

process.env.NEXTAUTH_URL ||= resolvedBaseUrl
process.env.AUTH_TRUST_HOST ||= "true"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "html",
  use: {
    baseURL: resolvedBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: useProductionServer
    ? {
        command: "npm run start",
        url: resolvedBaseUrl,
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : {
        command: "npm run dev",
        url: resolvedBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
