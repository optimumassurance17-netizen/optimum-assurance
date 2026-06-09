import { expect, test } from "@playwright/test"

const AUTHENTICATED_SESSION = {
  user: {
    id: "user_rcpro_test",
    email: "prospect.rcpro@example.com",
    name: "Prospect RC Pro",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

const RC_PRO_FORM_DRAFT = {
  activity: "Conseil en informatique",
  revenue: 120000,
  employees: 3,
  riskLevel: 4,
  options: [],
} as const

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const acceptButton = page.getByRole("button", { name: "Accepter" })
  try {
    await acceptButton.click({ timeout: 2000 })
  } catch {
    // Bandeau absent ou déjà accepté
  }
}

async function mockAuthenticatedSession(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(AUTHENTICATED_SESSION),
    })
  })
}

async function mockUnauthenticatedSession(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null",
    })
  })
}

async function fillRcProFormUntilSummary(page: import("@playwright/test").Page) {
  await page.getByLabel("Activité").fill(RC_PRO_FORM_DRAFT.activity)
  await page.getByLabel(/Chiffre d’affaires/i).fill(String(RC_PRO_FORM_DRAFT.revenue))
  await page.getByLabel(/Nombre d’employés/i).fill(String(RC_PRO_FORM_DRAFT.employees))
  await page.getByRole("button", { name: "Continuer" }).click()
  await page.locator('input[type="range"]').evaluate((element, value) => {
    const input = element as HTMLInputElement
    input.value = String(value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }, RC_PRO_FORM_DRAFT.riskLevel)
  await page.getByRole("button", { name: "Continuer" }).click()
  await expect(page.getByRole("heading", { name: "Récapitulatif RC Pro" })).toBeVisible()
}

test.describe("RC Pro et RC fabriquant", () => {
  test("RC Pro : redirige vers la connexion avant l'enregistrement du devis", async ({ page }) => {
    await mockUnauthenticatedSession(page)

    await page.goto("/devis/rcpro")
    await dismissCookieBanner(page)
    await fillRcProFormUntilSummary(page)

    await expect(
      page.getByText("Connectez-vous pour enregistrer ce devis RC Pro et le retrouver dans votre espace client.")
    ).toBeVisible()

    await page.getByRole("button", { name: "Se connecter pour enregistrer le devis" }).click()

    await expect(page).toHaveURL(/\/connexion\?callbackUrl=%2Fdevis%2Frcpro%3Fresume%3D1/)
    const savedDraft = await page.evaluate(() => window.sessionStorage.getItem("optimum-rcpro-resume"))
    expect(savedDraft).toContain("Conseil en informatique")
  })

  test("RC Pro : reprend le devis après connexion et affiche le bon devoir de conseil", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await page.route("**/api/rcpro/calculate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ price: 987.65 }),
      })
    })
    await page.route("**/api/rcpro/create-quote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          quote: {
            id: "rcpro_quote_123",
            price: 987.65,
          },
        }),
      })
    })
    await page.addInitScript((draft) => {
      window.sessionStorage.setItem("optimum-rcpro-resume", JSON.stringify(draft))
    }, {
      form: RC_PRO_FORM_DRAFT,
      step: 3,
      autoSubmit: true,
    })

    await page.goto("/devis/rcpro?resume=1")
    await dismissCookieBanner(page)

    await expect(page).toHaveURL(/\/devis\/rcpro\/result\?id=rcpro_quote_123&price=987\.65/)
    await expect(page.getByRole("heading", { name: "Devis RC Pro — Resultat" })).toBeVisible()
    await expect(page.getByText(/assurance RC Pro/i)).toBeVisible()
    await expect(page.getByText(/niveau de risque et options/i)).toBeVisible()
  })

  test("RC fabriquant : parcours complet jusqu'à la confirmation", async ({ page }) => {
    await page.route("**/api/siret**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          raisonSociale: "RC Battery SAS",
          dateCreationSociete: "2018-01-15",
        }),
      })
    })
    await page.route("**/api/devis-rc-fabriquant", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/devis-rc-fabriquant")
    await dismissCookieBanner(page)

    await page.getByLabel(/E-mail professionnel/i).fill("contact@rc-battery.example")
    await page.getByLabel(/^SIRET/i).fill("73282932000074")
    await page.getByRole("button", { name: "Remplir" }).click()
    await expect(page.getByLabel(/Raison sociale/i)).toHaveValue("RC Battery SAS")
    await page.getByLabel(/Téléphone/i).fill("0601020304")
    await page.getByLabel(/Activité \/ produits fabriqués/i).fill("Fabrication de batteries lithium pour équipements industriels.")
    await page.getByRole("button", { name: "Continuer" }).click()

    await page.getByLabel(/Type de produit/i).selectOption({ label: "Batterie" })
    await page.getByLabel(/Zone de distribution/i).selectOption({ label: "Europe" })
    await page.getByLabel(/Produits certifiés CE/i).check()
    await page.getByLabel(/Tests thermiques \/ sécurité effectués/i).check()
    await page.getByRole("button", { name: "Continuer" }).click()

    await page.getByLabel(/CA annuel total estimé/i).fill("450000")
    await page.getByLabel(/CA export/i).fill("120000")
    await page.getByLabel(/Effectifs/i).fill("10-20")
    await page.getByRole("button", { name: "Continuer" }).click()

    await page.getByLabel(/Sinistres sur 5 ans/i).fill("0")
    await page.getByLabel(/J’accepte que mes données soient utilisées/i).check()
    await page.getByRole("button", { name: "Envoyer ma demande" }).click()

    await expect(page.getByText("Demande envoyée")).toBeVisible()
    await expect(page.getByText(/24 à 48 h ouvrées/i)).toBeVisible()
  })
})
