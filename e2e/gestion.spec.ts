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

function buildGestionDashboardWithDecennaleLead() {
  return {
    users: [],
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
    devisLeads: [
      {
        id: "lead_dec_1",
        email: "lead@example.com",
        raisonSociale: "Lead Exemple",
        siret: "12345678901234",
        primeAnnuelle: 1200,
        rappelSentAt: null,
        createdAt: "2026-06-09T08:00:00.000Z",
        slaHours: 36,
      },
    ],
    devisDrafts: [],
    pendingSignatures: [],
    sepaSubscriptions: [],
    insuranceContractsCount: 0,
    insuranceContracts: [],
    dashboardActions: [],
    dashboardActionsSummary: {
      total: 0,
      high: 0,
      medium: 0,
      overdue72h: 0,
      dismissedToday: 0,
    },
  }
}

function buildGestionDashboardWithDoContract() {
  return {
    users: [
      {
        id: "client_do_1",
        email: "client-do@example.com",
        raisonSociale: "Client DO",
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
    pendingSignatures: [],
    sepaSubscriptions: [],
    insuranceContractsCount: 1,
    insuranceContracts: [
      {
        id: "contract_do_1",
        contractNumber: "DO-2026-001",
        productType: "do",
        exclusionsJson: null,
        clientName: "Client DO",
        siret: "12345678901234",
        userId: "client_do_1",
        premium: 2400,
        status: "approved",
        paidAt: null,
        validUntil: null,
        createdAt: "2026-06-09T08:00:00.000Z",
        user: { id: "client_do_1", email: "client-do@example.com", raisonSociale: "Client DO" },
        lifecyclePayments: [],
      },
    ],
    dashboardActions: [],
    dashboardActionsSummary: {
      total: 0,
      high: 0,
      medium: 0,
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

function buildGestionClientData(
  overrides?: {
    user?: Partial<{
      id: string
      email: string
      raisonSociale: string
      siret: string
      adresse: string
      codePostal: string
      ville: string
      telephone: string
      createdAt: string
    }>
  }
) {
  return {
    user: {
      id: "client_1",
      email: "client@example.com",
      raisonSociale: "",
      siret: "",
      adresse: "",
      codePostal: "",
      ville: "",
      telephone: "",
      createdAt: "2026-06-09T08:00:00.000Z",
      doInitialQuestionnaireJson: null,
      doEtudeQuestionnaireJson: null,
      titleInitialQuestionnaireJson: null,
      titleEtudeQuestionnaireJson: null,
      ...(overrides?.user ?? {}),
    },
    documents: [],
    payments: [],
    avenantFees: [],
    notes: [],
    sinistres: [],
    userDocuments: [],
    userDocumentReviews: {},
    devisAutonomy: null,
    dda: {
      consents: [],
      events: [],
    },
  }
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

test.describe("Gestion CRM — création compte lead", () => {
  test("Compte déjà existant côté serveur : l'accès est renvoyé sans erreur UI", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDecennaleLead()),
      })
    })

    let createPayload: unknown = null
    await page.route("**/api/gestion/users/create-from-lead", async (route) => {
      createPayload = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user_existing_1",
          email: "lead@example.com",
          raisonSociale: "Lead Exemple",
          accessMode: "resent",
          emailSent: true,
        }),
      })
    })

    await page.goto("/gestion")
    await expect(page.getByRole("button", { name: "Créer le compte" })).toBeVisible()
    await page.getByRole("button", { name: "Créer le compte" }).click()

    expect(createPayload).toEqual({ leadId: "lead_dec_1", leadType: "decennale" })
    await expect(page.getByText("Accès client renvoyé à lead@example.com")).toBeVisible()
    await expect(page.getByRole("link", { name: /Compte existant/ })).toBeVisible()
  })

  test("Lead décennale : compte créé même si l'email d'accès échoue", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDecennaleLead()),
      })
    })

    await page.route("**/api/gestion/users/create-from-lead", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user_new_1",
          email: "lead@example.com",
          raisonSociale: "Lead Exemple",
          accessMode: "created",
          emailSent: false,
          temporaryPassword: "TempPass123",
          warning:
            "Compte créé, mais email d'accès non envoyé. Copiez le mot de passe temporaire affiché et transmettez-le manuellement au client.",
        }),
      })
    })

    await page.goto("/gestion")
    await page.getByRole("button", { name: "Créer le compte" }).click()

    await expect(
      page.getByText(
        "Compte créé, mais email d'accès non envoyé. Copiez le mot de passe temporaire affiché et transmettez-le manuellement au client. Mot de passe temporaire : TempPass123"
      )
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /Compte existant/ })).toBeVisible()
  })

  test("Fiche client : renvoi accès affiche le mot de passe si l'email échoue", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionClientData()),
      })
    })

    await page.route("**/api/gestion/clients/client_1/send-client-access", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          sentTo: "client@example.com",
          emailSent: false,
          temporaryPassword: "ManualPass789",
          warning:
            "Mot de passe temporaire généré, mais email non envoyé. Copiez-le et transmettez-le manuellement au client.",
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await page.getByRole("button", { name: "Créer / renvoyer accès client" }).click()

    await expect(
      page.getByText(
        "Mot de passe temporaire généré, mais email non envoyé. Copiez-le et transmettez-le manuellement au client. Mot de passe temporaire : ManualPass789"
      )
    ).toBeVisible()
  })
})

test.describe("Gestion CRM — contrats plateforme", () => {
  test("Contrat DO : bouton envoyer devis appelle l'endpoint email devis", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDoContract()),
      })
    })

    let sendQuoteCalled = false
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/send-quote", async (route) => {
      sendQuoteCalled = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com" }),
      })
    })

    await page.goto("/gestion")
    await expect(page.getByText("DO-2026-001", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Envoyer devis DO" }).click()

    expect(sendQuoteCalled).toBe(true)
    await expect(page.getByText("Devis DO envoyé à client-do@example.com.")).toBeVisible()
  })

  test("Contrat DO : bouton demander documents appelle l'endpoint email pièces", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDoContract()),
      })
    })

    let requestDocumentsCalled = false
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/request-documents", async (route) => {
      requestDocumentsCalled = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com" }),
      })
    })

    await page.goto("/gestion")
    await expect(page.getByText("DO-2026-001", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Demander documents DO" }).click()

    expect(requestDocumentsCalled).toBe(true)
    await expect(page.getByText("Demande documents DO envoyée à client-do@example.com.")).toBeVisible()
  })
})

test.describe("Gestion CRM — fiche client actions sensibles", () => {
  test("Fiche client : envoi email appelle l'endpoint gestion", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionClientData()),
      })
    })

    let emailPayload: unknown = null
    await page.route("**/api/gestion/clients/send-email", async (route) => {
      emailPayload = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client@example.com" }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await page.getByRole("button", { name: "Envoyer un email" }).click()
    await page.getByPlaceholder("Objet de l'email").fill("Information dossier")
    await page.getByPlaceholder("Votre message...").fill("Bonjour, merci pour votre retour.")
    await page.getByRole("button", { name: "Envoyer", exact: true }).click()

    expect(emailPayload).toEqual({
      userId: "client_1",
      subject: "Information dossier",
      body: "Bonjour, merci pour votre retour.",
    })
    await expect(page.getByText("Email envoyé à client@example.com")).toBeVisible()
  })

  test("Fiche client : suppression appelle l'endpoint avec confirmation email", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      if (route.request().method() === "DELETE") {
        const payload = route.request().postDataJSON()
        expect(payload).toEqual({ confirmEmail: "client@example.com" })
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionClientData()),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await page.getByRole("button", { name: "Supprimer la fiche et l’espace client" }).click()
    await page.getByPlaceholder("Email du client").fill("client@example.com")
    await page.getByRole("button", { name: "Supprimer définitivement" }).click()

    await expect(page).toHaveURL(/\/gestion$/)
  })
})

test.describe("Gestion CRM — Sirene", () => {
  test("Fiche client : préremplit la raison sociale et l'adresse via Sirene", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionClientData()),
      })
    })

    await page.route("**/api/siret?siret=73282932000074", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          raisonSociale: "EXEMPLE BATIMENT SAS",
          adresse: "10 rue de Paris",
          codePostal: "75001",
          ville: "Paris",
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await expect(page.getByRole("heading", { name: "Fiche client" })).toBeVisible()

    const siretField = page.locator("label").filter({ hasText: /^SIRET$/ }).first().locator("xpath=..")
    await siretField.locator("input").fill("73282932000074")
    await siretField.getByRole("button", { name: "Remplir via Sirene" }).click()

    const raisonInput = page.locator("label").filter({ hasText: /^Raison sociale$/ }).first().locator("xpath=..").locator("input")
    const adresseInput = page.locator("label").filter({ hasText: /^Adresse$/ }).first().locator("xpath=..").locator("input")
    const codePostalInput = page.locator("label").filter({ hasText: /^Code postal$/ }).first().locator("xpath=..").locator("input")
    const villeInput = page.locator("label").filter({ hasText: /^Ville$/ }).first().locator("xpath=..").locator("input")

    await expect(raisonInput).toHaveValue("EXEMPLE BATIMENT SAS")
    await expect(adresseInput).toHaveValue("10 rue de Paris")
    await expect(codePostalInput).toHaveValue("75001")
    await expect(villeInput).toHaveValue("Paris")
  })

  test("Fiche client : recherche rapide ouvre une autre fiche client", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildGestionClientData({
            user: {
              id: "client_1",
              email: "client@example.com",
              raisonSociale: "Alpha BTP",
            },
          })
        ),
      })
    })

    await page.route("**/api/gestion/clients/client_2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildGestionClientData({
            user: {
              id: "client_2",
              email: "autre@example.com",
              raisonSociale: "Beta Conseil",
              siret: "98765432100012",
            },
          })
        ),
      })
    })

    await page.route("**/api/gestion/clients/search**", async (route) => {
      const url = new URL(route.request().url())
      const query = url.searchParams.get("q")?.toLowerCase() ?? ""
      const results = query.includes("beta")
        ? [
            {
              id: "client_2",
              email: "autre@example.com",
              raisonSociale: "Beta Conseil",
              siret: "98765432100012",
            },
          ]
        : []
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await expect(page.getByRole("heading", { name: "Fiche client" })).toBeVisible()

    await page.getByLabel("Recherche rapide d'une autre fiche client").fill("Beta")
    await expect(page.getByRole("link", { name: /Beta Conseil/ })).toBeVisible()
    await page.getByRole("link", { name: /Beta Conseil/ }).click()

    await expect(page).toHaveURL(/\/gestion\/clients\/client_2/)
    const emailInput = page.locator("label").filter({ hasText: /^Email \(connexion\)$/ }).first().locator("xpath=..").locator("input")
    const raisonInput = page.locator("label").filter({ hasText: /^Raison sociale$/ }).first().locator("xpath=..").locator("input")
    await expect(emailInput).toHaveValue("autre@example.com")
    await expect(raisonInput).toHaveValue("Beta Conseil")
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
