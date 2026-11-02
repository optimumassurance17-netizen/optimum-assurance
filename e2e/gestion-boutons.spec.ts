import { expect, test, type Locator, type Page } from "@playwright/test"

const MOCK_ADMIN_SESSION = {
  user: {
    id: "admin_e2e",
    email: "admin@example.com",
    name: "Admin Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

function buildDashboard() {
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
    documents: [
      {
        id: "att_1",
        userId: "client_do_1",
        type: "attestation",
        numero: "ATT-100",
        status: "valide",
        data: "{}",
        createdAt: "2026-06-09T08:00:00.000Z",
        user: { email: "client-do@example.com", raisonSociale: "Client DO" },
      },
      {
        id: "ctr_doc_1",
        userId: "client_do_1",
        type: "contrat",
        numero: "CTR-100",
        status: "valide",
        data: "{}",
        createdAt: "2026-06-09T08:00:00.000Z",
        user: { email: "client-do@example.com", raisonSociale: "Client DO" },
      },
    ],
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
        email: "lead-sans-compte@example.com",
        raisonSociale: "Lead Sans Compte",
        siret: "98765432109876",
        primeAnnuelle: 1200,
        rappelSentAt: null,
        createdAt: "2026-06-09T08:00:00.000Z",
        slaHours: 12,
      },
    ],
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
    dashboardActions: [
      {
        id: "ctr-contract_do_1",
        kind: "approved_unpaid_contract",
        priority: "high",
        title: "Contrat approuvé non payé",
        description: "DO-2026-001 (do) — 30h",
        href: "/gestion/clients/client_do_1",
        ageHours: 30,
      },
      {
        id: "lead-dec-lead_dec_1",
        kind: "decennale_lead_followup",
        priority: "medium",
        title: "Lead devis décennale à relancer",
        description: "lead-sans-compte@example.com — 30h",
        href: "#leads-decennale",
        ageHours: 30,
      },
    ],
    dashboardActionsSummary: {
      total: 2,
      high: 1,
      medium: 1,
      overdue72h: 0,
      dismissedToday: 0,
    },
  }
}

function buildClient() {
  return {
    user: {
      id: "client_1",
      email: "client@example.com",
      raisonSociale: "Client Fiche",
      siret: "12345678901234",
      adresse: "10 rue du Test",
      codePostal: "75002",
      ville: "Paris",
      telephone: "0600000000",
      createdAt: "2026-06-09T08:00:00.000Z",
      doInitialQuestionnaireJson: null,
      doEtudeQuestionnaireJson: null,
      titleInitialQuestionnaireJson: null,
      titleEtudeQuestionnaireJson: null,
    },
    documents: [],
    payments: [],
    avenantFees: [],
    notes: [],
    sinistres: [],
    userDocuments: [],
    userDocumentReviews: {},
    devisAutonomy: null,
    activity: [],
    dda: { consents: [], events: [] },
    canGenerateDecennaleAttestation: true,
    echeances: [],
  }
}

async function mockAdmin(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ADMIN_SESSION),
    })
  })
}

async function expectInsideViewport(locator: Locator) {
  const box = await locator.boundingBox()
  const viewport = locator.page().viewportSize()
  expect(box, "le bouton doit être visible").not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(-1)
  expect(box!.y).toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1)
}

test.describe("Gestion — boutons d'action", () => {
  test("Le tableau de bord déclenche chaque action principale", async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await mockAdmin(page)

    const calls: string[] = []
    let dashboardGets = 0
    await page.route("**/api/gestion/dashboard", async (route) => {
      if (route.request().method() === "GET") dashboardGets += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDashboard()),
      })
    })
    await page.route("**/api/gestion/users/create-from-lead", async (route) => {
      calls.push(`lead:${route.request().postData()}`)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user_lead_1",
          email: "lead-sans-compte@example.com",
          raisonSociale: "Lead Sans Compte",
          accessMode: "created",
          emailSent: true,
        }),
      })
    })
    await page.route("**/api/gestion/clients/client_do_1/send-client-access", async (route) => {
      calls.push("access:client_do_1")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com", emailSent: true }),
      })
    })
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/send-quote", async (route) => {
      calls.push("quote")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com", emailSent: true }),
      })
    })
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/request-documents", async (route) => {
      calls.push("documents")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com", emailSent: true }),
      })
    })
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/request-payment", async (route) => {
      calls.push("payment")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client-do@example.com", emailSent: true, amount: 2400 }),
      })
    })
    await page.route("**/api/gestion/insurance-contracts/contract_do_1/validate-do-payment", async (route) => {
      calls.push("validate-do-payment")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          contractNumber: "DO-2026-001",
          amount: 2400,
          alreadyPaid: false,
          emailSent: true,
        }),
      })
    })
    await page.route("**/api/gestion/documents/att_1/status", async (route) => {
      calls.push(`status:${route.request().postData()}`)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, emailSent: true }),
      })
    })

    await page.goto("/gestion")
    await expect(page.getByRole("heading", { name: "Gestion CRM" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Actions du jour (automatique)" })).toBeVisible()
    const actions = page.locator("#actions-du-jour")
    await expect(actions.getByRole("link", { name: /Contrat approuvé non payé/ })).toHaveAttribute(
      "href",
      "/gestion/clients/client_do_1"
    )
    await expect(actions.getByText("Ouvre la fiche client")).toBeVisible()
    await actions.getByRole("link", { name: /Lead devis décennale/ }).click()
    await expect(page.locator("#leads-decennale")).toBeInViewport()
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Créer un avenant" })).toHaveCount(0)

    const exports = page.getByRole("toolbar", { name: "Exports du tableau de bord" })
    for (const name of ["Export paiements", "Export clients"]) {
      await expectInsideViewport(exports.getByRole("button", { name }))
    }

    const downloadPromise = page.waitForEvent("download")
    await exports.getByRole("button", { name: "Export clients" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain("export-clients")

    const getsBeforeRefresh = dashboardGets
    await page.getByRole("button", { name: "Rafraîchir les données" }).click()
    await expect.poll(() => dashboardGets).toBeGreaterThan(getsBeforeRefresh)

    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Clients" }).click()
    await expect(page.locator("#clients")).toBeInViewport()

    await page.locator("#clients").getByRole("button", { name: "Créer / renvoyer accès client" }).click()
    await expect(page.getByText("Accès client envoyé à client-do@example.com")).toBeVisible()

    await page.locator("#clients").getByRole("button", { name: "Demander un document" }).click()
    await expect(page.locator("#clients").getByRole("button", { name: "Envoyer la demande" })).toBeVisible()
    await page.locator("#clients").getByRole("button", { name: "Annuler" }).click()
    await expect(page.locator("#clients").getByRole("button", { name: "Envoyer la demande" })).toHaveCount(0)

    await page.locator("#leads-decennale").getByRole("button", { name: "Créer le compte" }).click()
    await expect(page.getByText("Compte créé pour lead-sans-compte@example.com")).toBeVisible()
    expect(calls.some((call) => call.includes('"leadType":"decennale"'))).toBe(true)

    const contracts = page.locator("#contrats-plateforme")
    await contracts.getByRole("button", { name: "Envoyer devis DO" }).click()
    await expect(page.getByText("Devis DO envoyé à client-do@example.com.")).toBeVisible()
    await contracts.getByRole("button", { name: "Demander documents DO" }).click()
    await expect(page.getByText("Demande documents DO envoyée à client-do@example.com.")).toBeVisible()
    await contracts.getByRole("button", { name: "Demander paiement Mollie" }).click()
    await expect(page.getByText(/Demande de paiement envoyée à client-do@example.com/)).toBeVisible()
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("DO-2026-001")
      expect(dialog.message()).toMatch(/2[\s\u00a0\u202f]?400/)
      expect(dialog.message()).toContain("attestation")
      return dialog.accept()
    })
    await contracts.getByRole("button", { name: "Valider le paiement" }).click()
    await expect(page.getByText("Paiement dommage ouvrage validé. L'attestation est disponible.")).toBeVisible()

    await page.locator("#attestations").getByRole("button", { name: "Suspendre" }).click()
    await expect(page.getByText("Statut mis à jour")).toBeVisible()
    expect(calls.some((call) => call.includes('"status":"suspendu"'))).toBe(true)

    await page.locator("#contrats").getByRole("button", { name: "Modifier" }).click()
    const editDialog = page.getByRole("dialog", { name: /Modifier le contrat/ })
    await expect(editDialog).toBeVisible()
    await editDialog.getByRole("button", { name: "Annuler" }).click()
    await expect(editDialog).toHaveCount(0)

    await page.locator("#contrats").getByRole("button", { name: "Autoriser annulation" }).click()
    const cancelDialog = page.getByRole("dialog", { name: "Autoriser l'annulation" })
    await expect(cancelDialog).toBeVisible()
    await cancelDialog.getByRole("button", { name: "Annuler" }).click()
    await expect(cancelDialog).toHaveCount(0)

    expect(calls).toEqual(
      expect.arrayContaining(["access:client_do_1", "quote", "documents", "payment", "validate-do-payment"])
    )

    await page.route("**/api/gestion/clients/client_do_1", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      const body = buildClient()
      body.user.id = "client_do_1"
      body.user.email = "client-do@example.com"
      body.user.raisonSociale = "Client DO"
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      })
    })
    await page.locator("#actions-du-jour").getByRole("link", { name: /Contrat approuvé non payé/ }).click()
    await expect(page).toHaveURL(/\/gestion\/clients\/client_do_1/)
    await expect(page.getByRole("heading", { name: "Fiche client" })).toBeVisible()
    await expect(
      page.locator("label", { hasText: /^Raison sociale$/ }).locator("xpath=following-sibling::input")
    ).toHaveValue("Client DO")
  })

  test("Sur mobile, la gestion s'ouvre sur le travail du jour", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockAdmin(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDashboard()),
      })
    })

    await page.goto("/gestion")
    const openTools = page.getByRole("button", { name: "Graphiques et créations" })
    await openTools.scrollIntoViewIfNeeded()
    await expectInsideViewport(openTools)
    await expect(page.getByRole("heading", { name: "Actions du jour (automatique)" })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Créer un avenant" })).toHaveCount(0)

    await openTools.click()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toBeVisible()
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Avenant" }).click()
    await expect(page.locator("#creer-avenant")).toBeInViewport()

    await page.getByRole("button", { name: "Revenir au travail du jour" }).click()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await expect(page.locator("#actions-du-jour")).toBeVisible()
  })

  test("La fiche client déclenche chaque action de la barre", async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 390, height: 900 })
    await mockAdmin(page)

    const calls: string[] = []
    await page.route("**/api/gestion/clients/client_1", async (route) => {
      if (route.request().method() === "PATCH") {
        calls.push(`patch:${route.request().postData()}`)
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
        body: JSON.stringify(buildClient()),
      })
    })
    await page.route("**/api/gestion/clients/client_1/send-client-access", async (route) => {
      calls.push("access")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client@example.com", emailSent: true }),
      })
    })
    await page.route("**/api/gestion/clients/client_1/attestation-decennale", async (route) => {
      calls.push("attestation")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          emailSent: true,
          document: {
            id: "att_new",
            type: "attestation",
            numero: "ATT-NEW",
            status: "valide",
            createdAt: "2026-10-12T10:00:00.000Z",
          },
        }),
      })
    })
    await page.route("**/api/gestion/clients/send-email", async (route) => {
      calls.push(`email:${route.request().postData()}`)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sentTo: "client@example.com", emailSent: true }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    const toolbar = page.getByRole("toolbar", { name: "Actions de la fiche client" })
    await expect(toolbar).toBeVisible()
    const names = [
      "Créer / renvoyer accès client",
      "Sinistre",
      "Générer attestation décennale",
      "Demander un document",
      "Demander relevé sinistralité",
      "Envoyer un email",
    ]
    for (const name of names) {
      const button = toolbar.getByRole("button", { name })
      await expect(button).toBeVisible()
      await expectInsideViewport(button)
    }

    await toolbar.getByRole("button", { name: "Créer / renvoyer accès client" }).click()
    await expect(page.getByText("Accès espace client envoyé à client@example.com")).toBeVisible()

    await toolbar.getByRole("button", { name: "Sinistre" }).click()
    const sinistreDialog = page.getByRole("dialog", { name: "Lier un sinistre à un relevé de sinistralité" })
    await expect(sinistreDialog).toBeVisible()
    await sinistreDialog.getByRole("button", { name: "Annuler" }).click()
    await expect(sinistreDialog).toHaveCount(0)

    await toolbar.getByRole("button", { name: "Générer attestation décennale" }).click()
    await expect(page.getByText(/Attestation ATT-NEW générée/)).toBeVisible()

    await toolbar.getByRole("button", { name: "Demander un document" }).click()
    await expect(page.getByRole("heading", { name: "Demander un document" })).toBeInViewport()

    await toolbar.getByRole("button", { name: "Demander relevé sinistralité" }).click()
    await expect(page.getByText("Modèle: Demande relevé de sinistralité")).toBeVisible()
    await page.getByRole("button", { name: "Annuler" }).click()

    await toolbar.getByRole("button", { name: "Envoyer un email" }).click()
    await page.getByPlaceholder("Objet de l'email").fill("Relance dossier")
    await page.getByPlaceholder("Votre message...").fill("Merci de revenir vers nous.")
    await page.getByRole("button", { name: "Envoyer", exact: true }).click()
    await expect(page.getByText("Email envoyé à client@example.com")).toBeVisible()

    await page.getByRole("button", { name: "Enregistrer la fiche" }).click()
    await expect(page.getByText("Fiche enregistrée")).toBeVisible()

    expect(calls).toContain("access")
    expect(calls).toContain("attestation")
    expect(calls.some((call) => call.includes("Relance dossier"))).toBe(true)
    expect(calls.some((call) => call.startsWith("patch:"))).toBe(true)
  })

  test("La recherche retrouve la SCI et propose de valider le paiement", async ({ page }) => {
    await mockAdmin(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDashboard()),
      })
    })
    await page.route("**/api/gestion/clients/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [],
          devisDoLeads: [],
          contracts: [
            {
              id: "contract_gokse",
              contractNumber: "DO-2026-077",
              productType: "do",
              clientName: "SCI Gokse",
              status: "approved",
              premium: 3200,
              paidAt: null,
              hasCertificate: false,
              userId: "client_gokse",
            },
          ],
        }),
      })
    })

    await page.goto("/gestion")
    await page.getByLabel("Recherche fiche client").fill("gokse")
    const result = page.getByRole("listitem").filter({ hasText: "SCI Gokse" })
    await expect(result).toBeVisible()
    await expect(result.getByRole("link", { name: "Ouvrir la fiche" })).toHaveAttribute(
      "href",
      "/gestion/clients/client_gokse"
    )
    await expect(result.getByRole("button", { name: "Valider le paiement" })).toBeVisible()
  })
})
