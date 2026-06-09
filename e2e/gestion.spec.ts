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

function buildGestionDashboardWithDirectClientLinks() {
  return {
    users: [
      {
        id: "user_sig_link_1",
        email: "signature@example.com",
        raisonSociale: "EXCELLODECO",
        siret: "11111111111111",
        createdAt: "2026-06-09T08:00:00.000Z",
      },
      {
        id: "user_contract_link_1",
        email: "contrat@example.com",
        raisonSociale: "Excellodeco Contrat",
        siret: "12345678901234",
        createdAt: "2026-06-09T08:00:00.000Z",
      },
    ],
    documents: [],
    payments: [],
    avenantFees: [],
    devisDoLeads: [],
    devisRcFabriquantLeads: [],
    devisAssuranceTitreLeads: [],
    devisEtudeLeads: [],
    resiliationLogs: [],
    resiliationRequests: [],
    adminActivityLogs: [],
    devisLeads: [],
    devisDrafts: [],
    pendingSignatures: [
      {
        id: "pending_sig_link_1",
        signatureRequestId: "44444444-4444-4444-8444-444444444444",
        contractNumero: "OPT-DEC-2026-0020",
        createdAt: "2026-06-09T08:00:00.000Z",
        userId: "user_sig_link_1",
        user: null,
        signatureFlow: "decennale",
        ageHours: 30,
        repairEligible: true,
      },
    ],
    sepaSubscriptions: [],
    insuranceContractsCount: 1,
    insuranceContracts: [
      {
        id: "contract_link_1",
        contractNumber: "CTR-PLAT-001",
        productType: "assurance_titre",
        exclusionsJson: null,
        clientName: "Excellodeco Contrat",
        siret: "12345678901234",
        userId: null,
        premium: 399,
        status: "approved",
        paidAt: null,
        validUntil: null,
        createdAt: "2026-06-09T08:00:00.000Z",
        user: null,
        lifecyclePayments: [],
      },
    ],
    dashboardActions: [
      {
        id: "sig-44444444-4444-4444-8444-444444444444",
        kind: "signature_pending",
        priority: "medium",
        title: "Signature en attente",
        description: "Référence OPT-DEC-2026-0020 — 30h",
        href: "#signatures-attente",
        ageHours: 30,
      },
      {
        id: "ctr-contract_link_1",
        kind: "approved_unpaid_contract",
        priority: "medium",
        title: "Contrat approuvé non payé",
        description: "CTR-PLAT-001 (assurance_titre) — 30h",
        href: "#contrats-plateforme",
        ageHours: 30,
      },
    ],
    dashboardActionsSummary: {
      total: 2,
      high: 0,
      medium: 2,
      overdue72h: 0,
      dismissedToday: 0,
    },
  }
}

async function mockGestionAuth(page: import("@playwright/test").Page) {
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

test.describe("Gestion CRM — accès direct fiche client", () => {
  test("Affiche la fiche client depuis l'action du jour, la signature en attente et le contrat plateforme", async ({
    page,
  }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDirectClientLinks()),
      })
    })

    await page.goto("/gestion")

    const actionsSection = page.locator("#actions-du-jour")
    const signatureAction = actionsSection.locator("div.rounded-lg", {
      hasText: "OPT-DEC-2026-0020",
    })
    await expect(signatureAction.getByRole("link", { name: "Fiche client" })).toHaveAttribute(
      "href",
      "/gestion/clients/user_sig_link_1"
    )

    const signatureRow = page.locator("#signatures-attente tr", {
      hasText: "OPT-DEC-2026-0020",
    })
    await expect(signatureRow.getByRole("link", { name: "Fiche client" })).toHaveAttribute(
      "href",
      "/gestion/clients/user_sig_link_1"
    )

    const contractRow = page.locator("#contrats-plateforme tr", {
      hasText: "CTR-PLAT-001",
    })
    await expect(contractRow.getByRole("link", { name: "Fiche client" })).toHaveAttribute(
      "href",
      "/gestion/clients/user_contract_link_1"
    )
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
