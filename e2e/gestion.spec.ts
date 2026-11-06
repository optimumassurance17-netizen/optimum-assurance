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

  test("API health : expose l'état infra et les champs ged/sirene", async ({ request }) => {
    const res = await request.get("/api/health")
    const j = (await res.json()) as {
      status?: string
      database?: string
      ged?: { supabaseUrl?: string; serviceRole?: string; ready?: boolean }
      esign?: { ready?: boolean }
      sirene?: { insee?: string }
    }

    expect([200, 503]).toContain(res.status())
    expect(j.status).toMatch(/ok|error/)
    expect(j.database).toMatch(/connected|disconnected/)
    expect(j.ged).toBeDefined()
    expect(typeof j.ged?.ready).toBe("boolean")
    expect(j.ged?.supabaseUrl).toMatch(/configured|missing/)
    expect(j.ged?.serviceRole).toMatch(/configured|missing/)
    expect(j.esign).toBeUndefined()
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

  test("Lead décennale : compte créé même si l'e-mail d'accès échoue", async ({ page }) => {
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
            "Compte créé, mais e-mail d'accès non envoyé. Copiez le mot de passe temporaire affiché et transmettez-le manuellement au client.",
        }),
      })
    })

    await page.goto("/gestion")
    await page.getByRole("button", { name: "Créer le compte" }).click()

    await expect(
      page.getByRole("status").getByText(
        "Compte créé, mais e-mail d'accès non envoyé. Copiez le mot de passe temporaire affiché et transmettez-le manuellement au client. Mot de passe temporaire : TempPass123"
      )
    ).toBeVisible()
    await expect(page.getByRole("alert").filter({ hasText: "Compte créé, mais e-mail d'accès non envoyé" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /Compte existant/ })).toBeVisible()
  })

  test("Fiche client : renvoi accès affiche le mot de passe si l'e-mail échoue", async ({ page }) => {
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
            "Mot de passe temporaire généré, mais e-mail non envoyé. Copiez-le et transmettez-le manuellement au client.",
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await page.getByRole("button", { name: "Créer / renvoyer accès client" }).click()

    await expect(
      page.getByRole("status").getByText(
        "Mot de passe temporaire généré, mais e-mail non envoyé. Copiez-le et transmettez-le manuellement au client. Mot de passe temporaire : ManualPass789"
      )
    ).toBeVisible()
    await expect(
      page.getByRole("alert").filter({ hasText: "Mot de passe temporaire généré, mais e-mail non envoyé" })
    ).toHaveCount(0)
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

  test("Contrat DO : email non parti n'affiche pas d'alerte rouge", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDoContract()),
      })
    })

    await page.route("**/api/gestion/insurance-contracts/contract_do_1/request-documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          emailSent: false,
          warning: "E-mail non envoyé (Resend ou domaine expéditeur). Aucun message n'est parti.",
        }),
      })
    })

    await page.goto("/gestion")
    await page.getByRole("button", { name: "Demander documents DO" }).click()

    await expect(
      page.getByRole("status").getByText("E-mail non envoyé (Resend ou domaine expéditeur). Aucun message n'est parti.")
    ).toBeVisible()
    await expect(
      page.getByRole("alert").filter({ hasText: "E-mail non envoyé (Resend ou domaine expéditeur)" })
    ).toHaveCount(0)
  })

  test("Invitation PDF en échec laisse le tableau de bord affiché", async ({ page }) => {
    await mockGestionAuth(page)

    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildGestionDashboardWithDoContract()),
      })
    })
    await page.route("**/api/gestion/sign/send-custom-devis-pdf", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Signature électronique non configurée." }),
      })
    })

    await page.goto("/gestion")
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Créer un contrat dommage ouvrage" })).toHaveCount(0)
    await page.getByRole("button", { name: "Graphiques et créations" }).click()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toBeVisible()
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Devis DO" }).click()
    await expect(page.getByRole("heading", { name: "Créer un contrat dommage ouvrage" })).toBeVisible()
    await page.getByRole("button", { name: "Revenir au travail du jour" }).click()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await page.getByRole("button", { name: "Graphiques et créations" }).click()
    await page.getByRole("combobox").first().selectOption("client_do_1")
    await page.locator('input[type="file"]').setInputFiles({
      name: "devis.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.1\n%%EOF"),
    })
    await page.getByPlaceholder("ex. 2400 (annuel TTC)").fill("1200")
    await page.getByRole("button", { name: "Envoyer l’invitation de signature" }).click()

    await expect(page.getByRole("heading", { name: "Espace de gestion" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Réessayer" })).toHaveCount(0)
    await expect(page.getByRole("alert").filter({ hasText: "Signature électronique non configurée." })).toBeVisible()
  })
})

test.describe("Gestion CRM — fiche client actions sensibles", () => {
  test("Fiche client : autorise la modification puis met à jour le devis", async ({ page }) => {
    await mockGestionAuth(page)

    const client = {
      ...buildGestionClientData(),
      documents: [
        {
          id: "doc_devis_1",
          type: "devis_do",
          numero: "DO-2026-001",
          status: "brouillon",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      devisAutonomy: {
        allowDevisEdition: false,
        allowForcedActivities: false,
        forcedActivities: [],
        note: null,
        updatedAt: null,
        updatedBy: null,
      },
    }

    const captured: {
      edition: { allowDevisEdition?: boolean } | null
      devis: { data?: { primeAnnuelle?: string; adresseOperation?: string; email?: string } } | null
    } = { edition: null, devis: null }
    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(client),
      })
    })

    await page.route("**/api/gestion/documents/doc_devis_1/edition", async (route) => {
      captured.edition = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ allowDevisEdition: true }),
      })
    })

    await page.route("**/api/gestion/documents/doc_devis_1", async (route) => {
      if (route.request().method() === "PATCH") {
        captured.devis = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: { primeAnnuelle: 3500 } }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "doc_devis_1",
          type: "devis_do",
          numero: "DO-2026-001",
          data: {
            raisonSociale: "SCA Démo",
            email: "client@example.com",
            primeAnnuelle: 3200,
            adresseOperation: "10 rue du Chantier, 75002 Paris",
            coutConstruction: 180000,
            activites: ["Maçonnerie"],
          },
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await expect(page.getByText("Chaque devis a sa propre autorisation.").first()).toBeVisible()
    await page.getByRole("button", { name: "Autoriser ce devis" }).click()
    expect(captured.edition?.allowDevisEdition).toBe(true)
    await expect(page.getByText("Modification autorisée pour ce devis.")).toBeVisible()
    await expect(page.getByText("Modification autorisée").first()).toBeVisible()

    await page.getByRole("button", { name: "Modifier le devis" }).click()
    await expect(page.getByRole("heading", { name: "Modifier le devis DO-2026-001" })).toBeVisible()
    await expect(page.getByText("ne changent pas le compte de connexion.")).toBeVisible()
    await expect(page.getByPlaceholder("Adresse de construction")).toHaveValue("10 rue du Chantier, 75002 Paris")
    await page.getByPlaceholder("Prime annuelle").fill("3500")
    await page.getByRole("button", { name: "Enregistrer le devis" }).click()

    expect(captured.devis?.data?.primeAnnuelle).toBe("3500")
    expect(captured.devis?.data?.adresseOperation).toBe("10 rue du Chantier, 75002 Paris")
    expect(captured.devis?.data?.email).toBe("client@example.com")
    await expect(page.getByText("Devis DO-2026-001 mis à jour.")).toBeVisible()
  })

  test("Fiche client : retirer l'autorisation générale laisse les devis déjà réglés", async ({ page }) => {
    await mockGestionAuth(page)

    let generalAuthorization = true
    const captured: { allowDevisEdition?: boolean; forcedActivities?: string } = {}
    await page.route("**/api/gestion/clients/client_1", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as {
          devisAutonomy?: { allowDevisEdition?: boolean; forcedActivities?: string }
        }
        captured.allowDevisEdition = body.devisAutonomy?.allowDevisEdition
        captured.forcedActivities = body.devisAutonomy?.forcedActivities
        generalAuthorization = body.devisAutonomy?.allowDevisEdition === true
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            devisAutonomy: {
              allowDevisEdition: false,
              allowForcedActivities: true,
              forcedActivities: ["Maçonnerie"],
              note: null,
              updatedAt: "2026-10-11T23:00:00.000Z",
              updatedBy: "admin@example.com",
            },
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...buildGestionClientData(),
          devisAutonomy: {
            allowDevisEdition: generalAuthorization,
            allowForcedActivities: true,
            forcedActivities: ["Maçonnerie"],
            note: null,
            updatedAt: "2026-10-01T10:00:00.000Z",
            updatedBy: "admin@example.com",
          },
          documents: [
            {
              id: "doc_herite",
              type: "devis",
              numero: "DEC-HERITE",
              status: "brouillon",
              createdAt: "2026-10-01T10:00:00.000Z",
              allowDevisEdition: generalAuthorization,
              devisEditionSource: generalAuthorization ? "fiche" : "aucune",
            },
            {
              id: "doc_explicite",
              type: "devis_do",
              numero: "DO-EXPLICITE",
              status: "brouillon",
              createdAt: "2026-10-02T10:00:00.000Z",
              allowDevisEdition: true,
              devisEditionSource: "document",
            },
          ],
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    const inherited = page.locator("tr", { hasText: "DEC-HERITE" })
    const explicit = page.locator("tr", { hasText: "DO-EXPLICITE" })
    await expect(page.getByText("Elle ouvre aussi les nouveaux devis.")).toBeVisible()
    await expect(inherited.getByText("Ouvert par l'autorisation générale")).toBeVisible()
    await expect(inherited.getByText("Modification autorisée")).toHaveCount(0)
    await expect(explicit.getByText("Modification autorisée")).toBeVisible()

    await page.getByRole("button", { name: "Retirer l'autorisation générale" }).click()

    expect(captured.allowDevisEdition).toBe(false)
    expect(captured.forcedActivities).toBe("Maçonnerie")
    await expect(page.getByText("Autorisation générale retirée.")).toBeVisible()
    await expect(page.getByText("Elle ouvre aussi les nouveaux devis.")).toHaveCount(0)
    await expect(inherited.getByText("Ouvert par l'autorisation générale")).toHaveCount(0)
    await expect(inherited.getByText("Modification autorisée")).toHaveCount(0)
    await expect(inherited.getByRole("button", { name: "Autoriser ce devis" })).toBeVisible()
    await expect(explicit.getByText("Modification autorisée")).toBeVisible()
    await expect(explicit.getByRole("button", { name: "Retirer l'autorisation", exact: true })).toBeVisible()
  })

  test("Fiche client : corrige le devis DO à préparer sans créer de contrat", async ({ page }) => {
    await mockGestionAuth(page)

    const initialJson = JSON.stringify({
      coutTotal: 180000,
      adresseConstruction: "10 rue Ancienne",
      codePostalConstruction: "75002",
      villeConstruction: "Paris",
    })
    const base = buildGestionClientData()
    const client = {
      ...base,
      doLeadId: "cldo0001lead",
      insuranceContracts: [],
      user: {
        ...base.user,
        doInitialQuestionnaireJson: initialJson,
      },
    }
    const captured: { chantier?: string; constructionCost?: string } = {}

    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(client),
      })
    })
    await page.route("**/api/gestion/clients/client_1/devis-do", async (route) => {
      const body = route.request().postDataJSON() as { chantier?: string; constructionCost?: string }
      captured.chantier = body.chantier
      captured.constructionCost = body.constructionCost
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sourceKey: "doInitialQuestionnaireJson",
          questionnaireJson: JSON.stringify({
            coutTotal: 250000,
            coutConstruction: 250000,
            adresseConstruction: "22 avenue du Port",
            adresseChantier: "22 avenue du Port",
            projectAddress: "22 avenue du Port",
            codePostalConstruction: "75002",
            villeConstruction: "Paris",
          }),
          leadId: "cldo0001lead",
          chantier: "22 avenue du Port",
          constructionCost: 250000,
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await expect(page.getByRole("heading", { name: "Devis DO à préparer" })).toBeVisible()
    await expect(page.getByText("Chantier : 10 rue Ancienne, 75002 Paris")).toBeVisible()
    await expect(page.getByText("Elle ne crée ni numéro de contrat ni paiement.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Ouvrir la demande DO" })).toHaveAttribute(
      "href",
      "/gestion#demande-do-cldo0001lead"
    )
    await page.getByPlaceholder("Adresse du chantier").fill("22 avenue du Port")
    await page.getByPlaceholder("Coût de construction").fill("250000")
    await page.getByRole("button", { name: "Enregistrer le devis DO" }).click()

    expect(captured.chantier).toBe("22 avenue du Port")
    expect(captured.constructionCost).toBe("250000")
    await expect(page.getByText("Devis DO à préparer mis à jour.")).toBeVisible()
    await expect(page.getByText("22 avenue du Port, 75002 Paris")).toBeVisible()
    await expect(page.getByText(/250\s000 €/)).toBeVisible()
  })

  test("Fiche client : le contrôle DDA s'affiche en français", async ({ page }) => {
    await mockGestionAuth(page)

    const client = buildGestionClientData()
    await page.route("**/api/gestion/clients/client_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...client,
          dda: {
            consents: [
              {
                id: "consent_rc",
                email: "client@example.com",
                userId: "client_1",
                page: "rc_pro_result",
                produit: "rc-pro",
                acceptedAt: "2026-10-12T08:00:00.000Z",
              },
              {
                id: "consent_titre",
                email: "client@example.com",
                userId: "client_1",
                page: "assurance_titre",
                produit: "assurance-titre",
                acceptedAt: "2026-10-12T07:30:00.000Z",
              },
            ],
            events: [
              {
                id: "log_dda_1",
                adminEmail: "dda@system",
                action: "dda_advice_acknowledged",
                targetType: "devoir_conseil_log",
                targetId: "logdda01",
                targetLabel: "Log #logdda01",
                details: { produit: "decennale", needsSummary: "Décennale | 2 activités" },
                createdAt: "2026-10-12T08:00:00.000Z",
              },
              {
                id: "log_dda_rc",
                adminEmail: "dda@system",
                action: "dda_rc_fabriquant_needs_captured",
                targetType: "DevisRcFabriquantLead",
                targetId: "leadrc001",
                targetLabel: "Demande RC fabricant",
                details: { produit: "rc-fabriquant", needsSummary: "Besoins fabrication" },
                createdAt: "2026-10-12T07:00:00.000Z",
              },
              {
                id: "log_dda_contract",
                adminEmail: "dda@system",
                action: "dda_contract_suitability_checked",
                targetType: "insurance_contract",
                targetId: "ctr00001",
                targetLabel: null,
                details: { produit: "assurance-titre" },
                createdAt: "2026-10-12T06:00:00.000Z",
              },
            ],
          },
        }),
      })
    })

    await page.goto("/gestion/clients/client_1")
    await page.getByRole("button", { name: "Questionnaires et conformité" }).click()
    await expect(page.getByRole("heading", { name: "Conformité DDA" })).toBeVisible()
    await expect(page.getByText("Devoir de conseil confirmé")).toBeVisible()
    await expect(page.getByText("Besoins RC fabricant enregistrés")).toBeVisible()
    await expect(page.getByText("Décennale | 2 activités")).toBeVisible()
    const ddaTable = page.locator("table")
    await expect(ddaTable.getByText("RC Pro", { exact: true })).toBeVisible()
    await expect(ddaTable.getByText("Résultat RC Pro")).toBeVisible()
    await expect(ddaTable.getByText("Assurance titre", { exact: true })).toBeVisible()
    await expect(ddaTable.getByText("Demande assurance titre")).toBeVisible()
    const ddaSection = page.locator("section", { has: page.getByRole("heading", { name: "Conformité DDA" }) })
    await expect(ddaSection.getByText("Cible : Log #logdda01")).toBeVisible()
    await expect(ddaSection.getByText("Cible : Demande RC fabricant")).toBeVisible()
    await expect(ddaSection.getByText("Contrat", { exact: true })).toBeVisible()
    await expect(page.getByText("dda_advice_acknowledged")).toHaveCount(0)
    await expect(page.getByText("dda_rc_fabriquant_needs_captured")).toHaveCount(0)
    await expect(page.getByText("devoir_conseil_log")).toHaveCount(0)
    await expect(page.getByText("DevisRcFabriquantLead")).toHaveCount(0)
    await expect(page.getByText("insurance_contract")).toHaveCount(0)
  })

  test("Fiche client : envoi de l'e-mail appelle l'endpoint gestion", async ({ page }) => {
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
    await page.getByRole("button", { name: "Envoyer un e-mail" }).click()
    await page.getByPlaceholder("Objet de l'e-mail").fill("Information dossier")
    await page.getByPlaceholder("Votre message...").fill("Bonjour, merci pour votre retour.")
    await page.getByRole("button", { name: "Envoyer", exact: true }).click()

    expect(emailPayload).toEqual({
      userId: "client_1",
      subject: "Information dossier",
      body: "Bonjour, merci pour votre retour.",
    })
    await expect(page.getByText("E-mail envoyé à client@example.com")).toBeVisible()
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
    await page.getByPlaceholder("E-mail du client").fill("client@example.com")
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
    await page.getByRole("button", { name: "Modifier les coordonnées" }).click()

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
    await page.getByRole("button", { name: "Modifier les coordonnées" }).click()
    const emailInput = page.locator("label").filter({ hasText: /^E-mail \(connexion\)$/ }).first().locator("xpath=..").locator("input")
    const raisonInput = page.locator("label").filter({ hasText: /^Raison sociale$/ }).first().locator("xpath=..").locator("input")
    await expect(emailInput).toHaveValue("autre@example.com")
    await expect(raisonInput).toHaveValue("Beta Conseil")
  })
})

test.describe("Gestion CRM — virement RC fabriquant", () => {
  test("Le virement reçu génère l'attestation et laisse la décennale de côté", async ({ page }) => {
    await mockGestionAuth(page)
    let payload: unknown = null
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "client_rc_1",
              email: "rc@example.com",
              raisonSociale: "Atelier RC",
              siret: "11111111111111",
              createdAt: "2026-11-01T08:00:00.000Z",
            },
          ],
          documents: [],
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [
            {
              id: "ctr_rc",
              contractNumber: "RCFAB-1",
              productType: "rc_fabriquant",
              clientName: "Atelier RC",
              userId: "client_rc_1",
              premium: 600,
              status: "approved",
              paidAt: null,
              validUntil: null,
              createdAt: "2026-11-01T08:00:00.000Z",
              hasCertificate: false,
              user: { id: "client_rc_1", email: "rc@example.com", raisonSociale: "Atelier RC" },
              lifecyclePayments: [],
            },
            {
              id: "ctr_dec",
              contractNumber: "DEC-PLATEFORME",
              productType: "decennale",
              clientName: "Atelier RC",
              userId: "client_rc_1",
              premium: 2400,
              status: "approved",
              paidAt: null,
              validUntil: null,
              createdAt: "2026-11-01T08:00:00.000Z",
              hasCertificate: false,
              user: { id: "client_rc_1", email: "rc@example.com", raisonSociale: "Atelier RC" },
              lifecyclePayments: [],
            },
          ],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
        }),
      })
    })
    await page.route("**/api/gestion/insurance-contracts/ctr_rc/validate-rc-payment", async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, kind: "first", alreadyPaid: false, emailSent: true }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/gestion")
    const table = page.locator("#contrats-plateforme")
    const rcRow = table.locator("tr", { hasText: "RCFAB-1" })
    const decRow = table.locator("tr", { hasText: "DEC-PLATEFORME" })
    await expect(rcRow.getByRole("button", { name: "Virement reçu" })).toBeVisible()
    await expect(decRow.getByRole("button", { name: "Virement reçu" })).toHaveCount(0)
    await expect(decRow.getByRole("button", { name: "Valider le paiement" })).toHaveCount(0)

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("prompt")
      expect(dialog.message()).toContain("RCFAB-1")
      expect(dialog.message()).toContain("attestation")
      return dialog.accept("VIR 03/11/2026")
    })
    await rcRow.getByRole("button", { name: "Virement reçu" }).click()
    await expect(page.getByText("Virement enregistré. L'attestation RC fabriquant est disponible.")).toBeVisible()
    expect(payload).toEqual({ virementReference: "VIR 03/11/2026" })
  })
})

test.describe("Gestion CRM — devis émis", () => {
  test("Le tableau distingue un devis expiré, un devis récent et un contrat ancien", async ({ page }) => {
    await mockGestionAuth(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "client_expire",
              email: "expire@example.com",
              raisonSociale: "Atelier Expire",
              siret: "11111111111111",
              createdAt: "2026-01-01T08:00:00.000Z",
            },
            {
              id: "client_recent",
              email: "recent@example.com",
              raisonSociale: "Atelier Recent",
              siret: "22222222222222",
              createdAt: "2026-11-01T08:00:00.000Z",
            },
            {
              id: "client_sans",
              email: "sans@example.com",
              raisonSociale: "Atelier Sans Date",
              siret: "33333333333333",
              createdAt: "2026-11-01T08:00:00.000Z",
            },
          ],
          documents: [
            {
              id: "devis_recent",
              userId: "client_recent",
              type: "devis",
              numero: "DEV-RECENT",
              status: "valide",
              createdAt: "2026-11-01T08:00:00.000Z",
              user: { email: "recent@example.com", raisonSociale: "Atelier Recent" },
            },
            {
              id: "devis_expire",
              userId: "client_expire",
              type: "devis",
              numero: "DEV-EXPIRE",
              status: "valide",
              createdAt: "2026-01-01T08:00:00.000Z",
              user: { email: "expire@example.com", raisonSociale: "Atelier Expire" },
            },
            {
              id: "devis_sans",
              userId: "client_sans",
              type: "devis_do",
              numero: "DO-SANS-DATE",
              status: "valide",
              user: { email: "sans@example.com", raisonSociale: "Atelier Sans Date" },
            },
            {
              id: "ctr_ancien",
              userId: "client_expire",
              type: "contrat",
              numero: "CTR-ANCIEN",
              status: "valide",
              createdAt: "2026-01-01T08:00:00.000Z",
              user: { email: "expire@example.com", raisonSociale: "Atelier Expire" },
            },
          ],
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: {
            total: 0,
            high: 0,
            medium: 0,
            overdue72h: 0,
            dismissedToday: 0,
          },
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/gestion")
    await expect(page.getByRole("link", { name: "Factures en retard" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Nouvelles demandes" })).toHaveCount(0)
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Devis émis" }).click()

    const section = page.locator("#devis-emis")
    await expect(section.getByRole("heading", { name: "Devis émis" })).toBeVisible()
    await expect(section.getByText("1 devis expiré. Passé 60 jours, pas de relance.")).toBeVisible()

    const expiredRow = section.locator("tr", { hasText: "DEV-EXPIRE" })
    const recentRow = section.locator("tr", { hasText: "DEV-RECENT" })
    const undatedRow = section.locator("tr", { hasText: "DO-SANS-DATE" })
    await expect(expiredRow.getByText("Expiré", { exact: true })).toBeVisible()
    await expect(expiredRow.getByText("Décennale")).toBeVisible()
    await expect(recentRow.getByText("Valide", { exact: true })).toBeVisible()
    await expect(recentRow.getByText("Expiré", { exact: true })).toHaveCount(0)
    await expect(undatedRow.getByText("Valide", { exact: true })).toBeVisible()
    await expect(undatedRow.getByText("Dommage ouvrage")).toBeVisible()
    await expect(undatedRow.getByText("Expiré", { exact: true })).toHaveCount(0)
    await expect(expiredRow.getByRole("link", { name: "Voir" })).toHaveAttribute("href", "/gestion/documents/devis_expire")
    await expect(expiredRow.getByRole("link", { name: "Client" })).toHaveAttribute("href", "/gestion/clients/client_expire")
    await expect(section.locator("tbody tr td.font-mono").first()).toHaveText("DEV-EXPIRE")

    const contractRow = page.locator("#contrats tr", { hasText: "CTR-ANCIEN" })
    await expect(contractRow.getByText("Valide", { exact: true })).toBeVisible()
    await expect(contractRow.getByText("Expiré", { exact: true })).toHaveCount(0)

    await page.getByPlaceholder(/Rechercher/).fill("DEV-RECENT")
    await expect(section.locator("tr", { hasText: "DEV-RECENT" })).toBeVisible()
    await expect(section.locator("tr", { hasText: "DEV-EXPIRE" })).toHaveCount(0)
    await expect(page.locator("#contrats").getByText("Aucun contrat")).toBeVisible()
  })

  test("La liste des devis émis s'arrête à 25 lignes et la recherche retrouve la suivante", async ({ page }) => {
    await mockGestionAuth(page)
    const documents = [
      {
        id: "devis_expire",
        userId: "client_1",
        type: "devis",
        numero: "DEV-EXPIRE",
        status: "valide",
        createdAt: "2026-01-01T08:00:00.000Z",
        user: { email: "client@example.com", raisonSociale: "Atelier Expire" },
      },
      ...Array.from({ length: 25 }, (_, index) => {
        const n = String(index + 2).padStart(2, "0")
        return {
          id: `devis_${n}`,
          userId: "client_1",
          type: "devis",
          numero: `DEV-${n}`,
          status: "valide",
          createdAt: "2026-11-01T08:00:00.000Z",
          user: { email: "client@example.com", raisonSociale: "Atelier Expire" },
        }
      }),
    ]
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "client_1",
              email: "client@example.com",
              raisonSociale: "Atelier Expire",
              siret: "11111111111111",
              createdAt: "2026-01-01T08:00:00.000Z",
            },
          ],
          documents,
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
        }),
      })
    })

    await page.goto("/gestion")
    const section = page.locator("#devis-emis")
    await expect(section.getByText("25 sur 26 devis")).toBeVisible()
    await expect(section.locator("tbody tr")).toHaveCount(25)
    await expect(section.locator("tr", { hasText: "DEV-EXPIRE" })).toBeVisible()
    await expect(section.locator("tr", { hasText: "DEV-26" })).toHaveCount(0)

    await page.getByPlaceholder(/Rechercher/).fill("DEV-26")
    await expect(section.locator("tr", { hasText: "DEV-26" })).toBeVisible()
    await expect(section.locator("tr", { hasText: "DEV-EXPIRE" })).toHaveCount(0)
  })
})

test.describe("Gestion CRM — parcours admin (optionnel)", () => {
  test.beforeEach(() => {
    test.skip(
      !hasE2EAdminCreds,
      "Définir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD : compte existant en base, même e-mail dans ADMIN_EMAILS."
    )
  })

  test("Connexion puis chargement du tableau de bord", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/connexion?callbackUrl=/gestion")
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible({ timeout: 15000 })

    await page.getByLabel("E-mail").fill(e2eAdminEmail!)
    await page.getByLabel("Mot de passe", { exact: false }).fill(e2eAdminPassword!)
    await page.getByRole("button", { name: "Se connecter" }).click()

    await expect(page).toHaveURL(/\/gestion/, { timeout: 20000 })
    await expect(page.locator("main.gestion-app")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Espace de gestion" })).toBeVisible()

    await expect(page.getByRole("navigation", { name: "Accès rapide sections gestion" })).toBeVisible()
    await expect(page.getByLabel("Recherche fiche client")).toBeVisible()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await page.getByRole("button", { name: "Graphiques et créations" }).click()
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toBeVisible()
  })
})

test.describe("Gestion CRM — factures en retard", () => {
  test("La liste du jour montre les échéances dépassées sans ouvrir les graphiques", async ({ page }) => {
    await mockGestionAuth(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [],
          documents: [],
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
          echeancesASuivre: [
            {
              userId: "user_recent",
              clientLabel: "Atelier Récent",
              echeanceId: "ech_2",
              label: "Échéance 3",
              amount: 120,
              dueDate: "2026-10-20T12:00:00.000Z",
              cardLinkStatus: "none",
            },
            {
              userId: "user_late",
              clientLabel: "Atelier RC",
              echeanceId: "ech_1",
              label: "Échéance 2",
              amount: 450,
              dueDate: "2026-10-01T12:00:00.000Z",
              cardLinkStatus: "expired",
            },
          ],
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/gestion")
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Factures en retard" }).click()

    const section = page.locator("#factures-en-retard")
    await expect(section.getByRole("heading", { name: "Factures en retard" })).toBeVisible()
    await expect(section.getByText("2 échéances sont dépassées et ne sont pas payées.")).toBeVisible()
    const rows = section.locator("tbody tr")
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText("Atelier RC")
    await expect(rows.nth(0)).toContainText("Échéance 2")
    await expect(rows.nth(0)).toContainText("450")
    await expect(rows.nth(0).getByText("En retard", { exact: true })).toBeVisible()
    await expect(rows.nth(0).getByText("Lien expiré")).toBeVisible()
    await expect(rows.nth(0).getByRole("link", { name: "Échéance" })).toHaveAttribute(
      "href",
      "/gestion/clients/user_late#echeance-ech_1"
    )
    await expect(rows.nth(1)).toContainText("Atelier Récent")

    await page.getByPlaceholder(/Rechercher/).fill("Atelier Récent")
    await expect(section.locator("tr", { hasText: "Atelier Récent" })).toBeVisible()
    await expect(section.locator("tr", { hasText: "Atelier RC" })).toHaveCount(0)
  })

  test("Une facture en retard ouvre la ligne d'échéance à régler", async ({ page }) => {
    await mockGestionAuth(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [],
          documents: [],
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
          echeancesASuivre: [
            {
              userId: "user_late",
              clientLabel: "Atelier RC",
              echeanceId: "decennale:2",
              label: "Échéance 2",
              amount: 450,
              dueDate: "2026-10-01T12:00:00.000Z",
              cardLinkStatus: "expired",
            },
          ],
        }),
      })
    })
    await page.route("**/api/gestion/clients/user_late", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...buildGestionClientData({
            user: { id: "user_late", email: "rc@example.com", raisonSociale: "Atelier RC" },
          }),
          echeances: [
            {
              id: "decennale:2",
              label: "Échéance 2",
              amount: 450,
              dueDate: "2026-10-01T12:00:00.000Z",
              paid: false,
              paidAt: null,
              cardLinkStatus: "expired",
            },
          ],
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 700 })
    await page.goto("/gestion")
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Factures en retard" }).click()
    await page.locator("#factures-en-retard").getByRole("link", { name: "Échéance" }).click()
    await expect(page).toHaveURL(/\/gestion\/clients\/user_late#echeance-decennale-2/)
    await expect(page.locator("#echeance-decennale-2")).toBeInViewport()
    await expect(page.getByRole("button", { name: "Règlement par carte bancaire" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Virement reçu" })).toBeVisible()
  })
})

test.describe("Gestion CRM — nouvelles demandes", () => {
  test("Les demandes de devis à traiter sont regroupées, la plus récente en premier", async ({ page }) => {
    await mockGestionAuth(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "client_recent",
              email: "recent@example.com",
              raisonSociale: "Atelier Recent",
              siret: "22222222222222",
              createdAt: "2026-11-01T08:00:00.000Z",
            },
          ],
          documents: [],
          payments: [],
          devisLeads: [
            {
              id: "lead_recent",
              email: "recent@example.com",
              raisonSociale: "Atelier Recent",
              siret: "22222222222222",
              primeAnnuelle: 900,
              rappelSentAt: null,
              createdAt: "2026-11-04T15:00:00.000Z",
            },
            {
              id: "lead_expire",
              email: "expire@example.com",
              raisonSociale: "Atelier Expire",
              siret: "11111111111111",
              primeAnnuelle: 400,
              rappelSentAt: null,
              createdAt: "2026-01-01T08:00:00.000Z",
            },
          ],
          devisDoLeads: [
            {
              id: "do_lead_01",
              email: "chantier@example.com",
              data: JSON.stringify({ raisonSociale: "Chantier DO" }),
              coutTotal: 120000,
              createdAt: "2026-11-03T10:00:00.000Z",
            },
          ],
          devisRcFabriquantLeads: [
            {
              id: "rc_lead_01",
              email: "rc@example.com",
              data: JSON.stringify({ raisonSociale: "Atelier RC" }),
              statut: "a_traiter",
              notesInternes: null,
              primeProposee: null,
              propositionEnvoyeeAt: null,
              createdAt: "2026-11-04T10:00:00.000Z",
              updatedAt: "2026-11-04T10:00:00.000Z",
              userId: null,
            },
            {
              id: "rc_lead_refuse",
              email: "refuse@example.com",
              data: JSON.stringify({ raisonSociale: "Atelier Refusé" }),
              statut: "refuse",
              notesInternes: null,
              primeProposee: null,
              propositionEnvoyeeAt: null,
              createdAt: "2026-11-04T16:00:00.000Z",
              updatedAt: "2026-11-04T16:00:00.000Z",
              userId: null,
            },
          ],
          devisEtudeLeads: [],
          devisAssuranceTitreLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/gestion")
    await expect(page.getByRole("heading", { name: /Devis PDF personnalisé/ })).toHaveCount(0)
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Nouvelles demandes" }).click()

    const section = page.locator("#nouvelles-demandes")
    await expect(section.getByRole("heading", { name: "Nouvelles demandes" })).toBeVisible()
    await expect(section.getByText("3 demandes de devis sont à traiter.")).toBeVisible()
    const rows = section.locator("tbody tr")
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText("Décennale")
    await expect(rows.nth(0)).toContainText("Atelier Recent")
    await expect(rows.nth(0).getByRole("link", { name: "Client" })).toHaveAttribute("href", "/gestion/clients/client_recent")
    await expect(rows.nth(0).getByRole("link", { name: "Voir" })).toHaveAttribute("href", "#lead-decennale-lead_recent")
    await expect(rows.nth(1)).toContainText("RC fabriquant")
    await expect(rows.nth(1)).toContainText("Atelier RC")
    await expect(rows.nth(2)).toContainText("Dommage ouvrage")
    await expect(rows.nth(2)).toContainText("Chantier DO")
    await expect(rows.nth(2).getByRole("link", { name: "Voir" })).toHaveAttribute("href", "#demande-do-do_lead_01")
    await expect(section.getByText("Atelier Expire")).toHaveCount(0)
    await expect(section.getByText("Atelier Refusé")).toHaveCount(0)

    await rows.nth(2).getByRole("link", { name: "Voir" }).click()
    await expect(page.locator("#demande-do-do_lead_01")).toBeVisible()

    await page.getByPlaceholder(/Rechercher/).fill("Atelier RC")
    await expect(section.locator("tr", { hasText: "Atelier RC" })).toBeVisible()
    await expect(section.locator("tr", { hasText: "Atelier Recent" })).toHaveCount(0)
    await expect(section.locator("tr", { hasText: "Chantier DO" })).toHaveCount(0)
  })

  test("Voir retrouve la demande récente masquée par l'aperçu de 25 lignes", async ({ page }) => {
    await mockGestionAuth(page)
    const devisLeads = Array.from({ length: 26 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0")
      return {
        id: `lead_${day}`,
        email: `lead-${day}@example.com`,
        raisonSociale: `Atelier ${day}`,
        siret: "",
        primeAnnuelle: 1000,
        rappelSentAt: null,
        createdAt: `2026-10-${day}T08:00:00.000Z`,
        slaHours: index,
      }
    })
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [],
          documents: [],
          payments: [],
          devisLeads,
          devisDoLeads: [],
          devisRcFabriquantLeads: [],
          devisEtudeLeads: [],
          devisAssuranceTitreLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
        }),
      })
    })

    await page.goto("/gestion")
    await page.getByRole("navigation", { name: "Accès rapide sections gestion" }).getByRole("link", { name: "Nouvelles demandes" }).click()
    const inbox = page.locator("#nouvelles-demandes")
    await expect(inbox.locator("tr", { hasText: "Atelier 26" })).toBeVisible()
    await expect(page.locator("#leads-decennale")).not.toContainText("Atelier 26")

    await inbox.locator("tr", { hasText: "Atelier 26" }).getByRole("link", { name: "Voir" }).click()
    const leads = page.locator("#leads-decennale")
    await expect(leads.locator("#lead-decennale-lead_26")).toBeInViewport()
    await expect(leads).toContainText("Atelier 26")
    await expect(leads).not.toContainText("Atelier 01")
  })
})

test.describe("Gestion CRM — modification d'un contrat", () => {
  test("Un contrat absent du tableau s'ouvre quand même", async ({ page }) => {
    await mockGestionAuth(page)
    await page.route("**/api/gestion/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [],
          documents: [],
          payments: [],
          devisLeads: [],
          devisDrafts: [],
          pendingSignatures: [],
          insuranceContracts: [],
          dashboardActions: [],
          dashboardActionsSummary: { total: 0, high: 0, medium: 0, overdue72h: 0, dismissedToday: 0 },
        }),
      })
    })
    await page.route("**/api/gestion/documents/doc_ancien", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "doc_ancien",
          type: "contrat",
          numero: "CTR-ANCIEN",
          data: { raisonSociale: "Atelier Ancien", email: "ancien@example.com" },
        }),
      })
    })

    await page.goto("/gestion?editDoc=doc_ancien")
    const dialog = page.getByRole("dialog", { name: /Modifier le contrat/ })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("CTR-ANCIEN")).toBeVisible()
    await expect(
      dialog.locator("label", { hasText: /^Raison sociale$/ }).locator("xpath=following-sibling::input")
    ).toHaveValue("Atelier Ancien")
    await expect(page).toHaveURL(/\/gestion$/)
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/gestion$/)
    await expect(dialog).toBeVisible()
  })
})
