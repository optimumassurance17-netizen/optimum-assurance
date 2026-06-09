import { test, expect } from "@playwright/test"

const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL?.trim()
const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD?.trim()
const hasE2EAdminCreds = Boolean(e2eAdminEmail && e2eAdminPassword)

const MOCK_ADMIN_SESSION = {
  user: {
    id: "admin_e2e",
    email: "admin@example.com",
    name: "Admin Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

function buildRectificationDashboard(signatureRequestId: string) {
  return {
    users: [],
    insuranceContracts: [],
    payments: [],
    pendingSignatures: [
      {
        id: "pending_1",
        signatureRequestId,
        contractNumero: "CTR-RECTIF-001",
        createdAt: "2026-06-09T08:00:00.000Z",
        userId: "user_rectif_1",
        user: {
          id: "user_rectif_1",
          email: "client@example.com",
          raisonSociale: "Client Rectif",
        },
        signatureFlow: "decennale",
        ageHours: 48,
        repairEligible: true,
      },
    ],
  }
}

async function mockGestionRectificationAuth(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ADMIN_SESSION),
    })
  })
}

test.describe("Gestion CRM — accès et API", () => {
  test("Sans session : redirection vers la connexion avec retour /gestion", async ({ page }) => {
    await page.goto("/gestion")
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15000 })
    expect(page.url()).toContain("callbackUrl=")
    expect(decodeURIComponent(page.url())).toContain("/gestion")
  })

  test("API dashboard gestion sans cookie : 403", async ({ request }) => {
    const res = await request.get("/api/gestion/dashboard")
    expect(res.status()).toBe(403)
    const j = (await res.json()) as { error?: string }
    expect(j.error).toBeTruthy()
  })

  test("API health : expose l'état infra et les champs esign/sirene", async ({ request }) => {
    const res = await request.get("/api/health")
    const j = (await res.json()) as {
      status?: string
      database?: string
      esign?: { supabaseUrl?: string; serviceRole?: string; ready?: boolean }
      sirene?: { insee?: string }
    }

    expect([200, 503]).toContain(res.status())
    expect(j.status).toMatch(/ok|error/)
    expect(j.database).toMatch(/connected|disconnected/)
    expect(j.esign).toBeDefined()
    expect(typeof j.esign?.ready).toBe("boolean")
    expect(j.sirene).toBeDefined()
    expect(j.sirene?.insee).toMatch(/configured|missing/)

    if (res.ok()) {
      expect(j.database).toBe("connected")
    } else {
      expect(res.status()).toBe(503)
      expect(j.database).toBe("disconnected")
    }
  })
})

test.describe("Gestion CRM — signatures en attente", () => {
  test("Rectification : annuler retire la ligne même si le refresh dashboard échoue", async ({ page }) => {
    const signatureRequestId = "11111111-1111-4111-8111-111111111111"
    await mockGestionRectificationAuth(page)

    let dashboardCalls = 0
    await page.route("**/api/gestion/dashboard", async (route) => {
      dashboardCalls += 1
      if (dashboardCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildRectificationDashboard(signatureRequestId)),
        })
        return
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "refresh unavailable" }),
      })
    })

    await page.route(`**/api/gestion/pending-signatures/${signatureRequestId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "Demande de signature annulée." }),
      })
    })

    await page.goto("/gestion/rectification")
    await expect(page.getByRole("heading", { name: "Rectification signatures en attente" })).toBeVisible()
    await expect(page.getByText("CTR-RECTIF-001")).toBeVisible()

    page.once("dialog", (dialog) => void dialog.accept())
    await page.getByRole("button", { name: "Annuler" }).click()

    await expect(page.getByText("Signature en attente annulée.")).toBeVisible()
    await expect(page.getByText("Aucune signature en attente.")).toBeVisible()
    await expect(page.getByText("CTR-RECTIF-001")).not.toBeVisible()
  })

  test("Rectification : réparer retire la ligne même si le refresh dashboard échoue", async ({ page }) => {
    const signatureRequestId = "22222222-2222-4222-8222-222222222222"
    await mockGestionRectificationAuth(page)

    let dashboardCalls = 0
    await page.route("**/api/gestion/dashboard", async (route) => {
      dashboardCalls += 1
      if (dashboardCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildRectificationDashboard(signatureRequestId)),
        })
        return
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "refresh unavailable" }),
      })
    })

    await page.route("**/api/gestion/signatures/repair", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/gestion/rectification")
    await expect(page.getByRole("heading", { name: "Rectification signatures en attente" })).toBeVisible()
    await expect(page.getByText("CTR-RECTIF-001")).toBeVisible()

    await page.getByRole("button", { name: "Réparer" }).click()

    await expect(page.getByText("Réparation signature effectuée.")).toBeVisible()
    await expect(page.getByText("Aucune signature en attente.")).toBeVisible()
    await expect(page.getByText("CTR-RECTIF-001")).not.toBeVisible()
  })
})

test.describe("Gestion CRM — parcours admin (optionnel)", () => {
  test.beforeEach(() => {
    test.skip(
      !hasE2EAdminCreds,
      "Définir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD : compte existant en base, même email dans ADMIN_EMAILS."
    )
  })

  test("Connexion puis chargement du tableau de bord", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/connexion?callbackUrl=/gestion")
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible({ timeout: 15000 })

    await page.getByLabel("Email").fill(e2eAdminEmail!)
    await page.getByLabel("Mot de passe", { exact: false }).fill(e2eAdminPassword!)
    await page.getByRole("button", { name: "Se connecter" }).click()

    await expect(page).toHaveURL(/\/gestion/, { timeout: 20000 })
    await expect(page.locator("main.gestion-app")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Gestion CRM" })).toBeVisible()

    await expect(page.getByRole("navigation", { name: "Accès rapide sections gestion" })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toBeVisible()
  })
})
