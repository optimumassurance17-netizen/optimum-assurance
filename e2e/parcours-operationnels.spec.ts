import { test, expect } from "@playwright/test"

const AUTHENTICATED_SESSION = {
  user: {
    id: "user_e2e",
    email: "prospect@example.com",
    name: "Prospect Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

const DECENNALE_DEVIS = {
  siret: "73282932000074",
  chiffreAffaires: 80000,
  sinistres: 0,
  jamaisAssure: false,
  activites: ["Plomberie sanitaire"],
  tarif: {
    primeAnnuelle: 1200,
    primeMensuelle: 100,
    primeTrimestrielle: 300,
    franchise: 1000,
    plafond: 160000,
    details: {
      base: 1200,
      majorationSinistres: 0,
      majorationNouveau: 0,
      majorationActivites: 0,
    },
  },
  raisonSociale: "SARL Test Optimum",
  adresse: "10 rue de Paris",
  codePostal: "75001",
  ville: "Paris",
  email: "prospect@example.com",
  telephone: "0601020304",
  representantLegal: "Jean Test",
  civilite: "M",
  insuranceProduct: "decennale",
} as const

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const banner = page.getByRole("dialog").filter({ hasText: /Cookies et confidentialité/i }).first()
  try {
    await banner.waitFor({ state: "visible", timeout: 3000 })
    await banner.getByRole("button", { name: "Accepter" }).click({ timeout: 3000, force: true })
    await expect(banner).toBeHidden({ timeout: 5000 })
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

test.describe("Parcours opérationnels décennale et dommage ouvrage", () => {
  test("Parcours décennale minimal jusqu'à la souscription", async ({ page }) => {
    await page.goto("/devis")
    await dismissCookieBanner(page)

    const continueButton = page.getByRole("button", { name: "Continuer vers la souscription" })

    await page.locator('input[type="number"]').first().fill("80000")
    await expect(
      page.getByText(
        "Sélectionnez au moins une activité pour obtenir un tarif cohérent et continuer vers la souscription."
      )
    ).toBeVisible()
    await expect(continueButton).toBeDisabled()

    await page.locator("#categorie-selection").selectOption({ label: "Toutes les catégories" })
    await page.locator("#activite-recherche").fill("plomberie")
    await page.locator("#activite-selection").selectOption("Plomberie sanitaire")
    await page.getByRole("button", { name: "Ajouter" }).click()

    await expect(page.getByRole("heading", { name: "Votre tarification" })).toBeVisible()
    await expect(continueButton).toBeEnabled()

    await continueButton.click()

    await expect(page).toHaveURL(/\/souscription$/)
    await expect(page.getByRole("heading", { name: "Souscription" })).toBeVisible()
    await expect(
      page.getByText("Complétez vos coordonnées pour finaliser votre assurance décennale.")
    ).toBeVisible()
  })

  test("Souscription décennale avec compte connecté -> signature", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.route("**/api/conversion/track", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/devoir-conseil/log", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/contracts/create", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          contract: {
            id: "contract_test_123",
            contractNumber: "CTR-TEST-123",
            status: "approved",
            riskScore: 0.12,
            riskReasons: [],
            rejectedReason: null,
          },
        }),
      })
    })

    await page.addInitScript((devis) => {
      window.sessionStorage.setItem("optimum-devis", JSON.stringify(devis))
    }, DECENNALE_DEVIS)

    await page.goto("/souscription")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "Souscription" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continuer (compte connecté)" })).toBeVisible()

    await page.getByLabel("J'ai pris connaissance des garanties et exclusions et confirme que ce contrat correspond à ma situation.").check()
    await page.getByRole("button", { name: "Continuer (compte connecté)" }).click()

    await expect(page).toHaveURL(/\/signature$/)
    await expect(page.getByRole("heading", { name: "Signature numérique" })).toBeVisible()
    await expect(page.getByText("SARL Test Optimum")).toBeVisible()
    await expect(page.getByRole("button", { name: "Signer le contrat (contrat type)" })).toBeVisible()
  })

  test("Parcours DO guidé jusqu'à l'écran de souscription en ligne", async ({ page }) => {
    await page.route("**/api/devis-dommage-ouvrage", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/devoir-conseil/log", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/devis-dommage-ouvrage")
    await dismissCookieBanner(page)

    await page.getByRole("button", { name: "Suivant →" }).click()
    await expect(
      page.getByText("Renseignez le nom ou la raison sociale du maître d'ouvrage.")
    ).toBeVisible()

    const stepOne = page.locator("form")
    await page.locator("#do-qualite").selectOption("promoteur")
    await page.getByPlaceholder("12345678900012").fill("73282932000074")
    await page.getByPlaceholder("Ex: SCI Dupont").fill("SCI Test Optimum")
    await stepOne.locator('input[type="text"]').nth(2).fill("10 rue de Paris")
    await stepOne.locator('input[type="text"]').nth(3).fill("75001")
    await stepOne.locator('input[type="text"]').nth(4).fill("Paris")
    await stepOne.locator('input[type="tel"]').fill("0601020304")
    await stepOne.locator('input[type="email"]').fill("prospect@example.com")

    await page.getByRole("button", { name: "Suivant →" }).click()
    await expect(page.getByText("2. Caractéristiques de l'opération")).toBeVisible()

    const stepTwo = page.locator("form")
    await stepTwo.locator('input[type="text"]').nth(0).fill("12 avenue du Chantier")
    await stepTwo.locator('input[type="text"]').nth(1).fill("33000")
    await stepTwo.locator('input[type="text"]').nth(2).fill("Bordeaux")
    await stepTwo.locator('input[type="number"]').first().fill("140")

    await page.getByRole("button", { name: "Suivant →" }).click()
    await expect(page.getByText("3. Type d'ouvrage")).toBeVisible()

    const stepThree = page.locator("form")
    await stepThree.locator('input[type="number"]').nth(0).fill("140")
    await stepThree.locator('input[type="number"]').nth(4).fill("250000")

    await page.getByRole("button", { name: "Suivant →" }).click()
    await expect(page.getByText("Caractéristiques techniques")).toBeVisible()

    await page.getByRole("button", { name: "Suivant →" }).click()
    await expect(page.getByText("Garanties souhaitées")).toBeVisible()

    const submitButton = page.getByRole("button", { name: "Envoyer ma demande" })
    await expect(submitButton).toBeDisabled()

    await page.locator("#devoir-conseil-do").check()
    await expect(submitButton).toBeEnabled()

    await submitButton.click()

    await expect(page.getByRole("heading", { name: "Demande envoyée" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Finaliser la souscription en ligne" })).toBeVisible()

    await page.getByRole("link", { name: "Finaliser la souscription en ligne" }).click()

    await expect(page).toHaveURL(/\/souscription-dommage-ouvrage$/)
    await expect(page.getByRole("heading", { name: "Souscription dommage ouvrage" })).toBeVisible()
    await expect(page.getByText("SCI Test Optimum")).toBeVisible()
  })
})
