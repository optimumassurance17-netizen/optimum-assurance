import { test, expect } from "@playwright/test"

/** Fermer le bandeau cookies s'il est visible */
async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const banner = page.getByRole("dialog").filter({ hasText: /Cookies et confidentialité/i }).first()
  try {
    await banner.waitFor({ state: "visible", timeout: 3000 })
    await banner.getByRole("button", { name: "Accepter" }).click({ timeout: 3000, force: true })
    await expect(banner).toBeHidden({ timeout: 5000 })
  } catch {
    // Pas de bandeau ou déjà fermé
  }
}

test.describe("Parcours devis → paiement → attestation", () => {
  test("Reprise devis par token -> retour sur devis prérempli puis souscription", async ({ page }) => {
    const resumeToken = "resume-token-e2e-123"

    await page.route(`**/api/devis/draft/${resumeToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "client.resume@example.com",
          produit: "decennale",
          data: {
            siret: "73282932000074",
            chiffreAffaires: 80000,
            sinistres: 0,
            jamaisAssure: true,
            resilieNonPaiement: false,
            reprisePasse: true,
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
            raisonSociale: "SARL Resume Optimum",
            adresse: "10 rue de Paris",
            codePostal: "75001",
            ville: "Paris",
            dateCreationSociete: "2024-01-15",
          },
        }),
      })
    })

    await page.route("**/api/conversion/track", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto(`/devis/resume/${resumeToken}`)
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { level: 1, name: "Demande de devis décennale" })).toBeVisible()
    await expect(page.getByPlaceholder("12345678900012")).toHaveValue("73282932000074")
    await expect(page.locator('input[type="number"]').first()).toHaveValue("80000")
    await expect(page.locator('input[type="number"]').nth(1)).toHaveValue("0")
    await expect(page.getByRole("checkbox", { name: "Je n'ai jamais été assuré" })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: /Reprise du passé/ })).toBeChecked()
    await expect(page.locator("#dateCreationSociete")).toHaveValue("2024-01-15")
    await expect(page.getByPlaceholder("votre@email.com")).toHaveValue("client.resume@example.com")
    await expect(page.locator("span.text-black.font-medium").filter({ hasText: "Plomberie sanitaire" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continuer vers la souscription" })).toBeEnabled()

    await page.getByRole("button", { name: "Continuer vers la souscription" }).click()

    await expect(page).toHaveURL(/\/souscription$/)
    await expect(page.getByRole("heading", { level: 1, name: "Souscription" })).toBeVisible()
  })

  test("Accès à la page devis et formulaire", async ({ page }) => {
    await page.goto("/devis")
    await expect(page.locator("h1")).toContainText("Demande de devis décennale")

    // Remplir SIRET (placeholder = 12345678900012)
    const siretInput = page.getByPlaceholder("12345678900012")
    await siretInput.fill("73282932000074")

    // Vérifier qu'on peut soumettre (bouton Remplir ou Calculer)
    const remplirBtn = page.getByRole("button", { name: "Remplir" })
    await expect(remplirBtn).toBeVisible()
  })

  test("Page accueil et navigation", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Optimum Assurance/)
    await expect(page.locator("h1")).toBeVisible()

    // Accepter les cookies si bandeau affiché
    await dismissCookieBanner(page)

    // Lien direct vers devis (éviter les menus déroulants)
    await page.goto("/devis")
    await expect(page).toHaveURL(/\/devis/)
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(/devis/i)
  })

  test("Page espace client (connexion requise)", async ({ page }) => {
    await page.goto("/espace-client")
    await expect(page).toHaveURL(/\/(connexion|espace-client)/)
  })

  test("Page devis dommage ouvrage", async ({ page }) => {
    await page.goto("/devis-dommage-ouvrage")
    await expect(page.locator("h1")).toContainText(/dommage ouvrage|devis/i)
  })

  test("Page devis RC fabriquant — bouton Sirene Remplir", async ({ page }) => {
    await page.goto("/devis-rc-fabriquant")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("button", { name: "Remplir" })).toBeVisible()
  })

  test("Liens footer et mentions légales", async ({ page }) => {
    await page.goto("/")
    await dismissCookieBanner(page)
    await page.waitForTimeout(800)
    const mentionsLink = page.getByRole("link", { name: "Mentions légales" }).first()
    await mentionsLink.scrollIntoViewIfNeeded()
    await mentionsLink.click()
    await expect(page).toHaveURL("/mentions-legales", { timeout: 10000 })
    await expect(page.locator("h1")).toContainText("Mentions légales")
  })

  test("Politique de confidentialité", async ({ page }) => {
    await page.goto("/confidentialite")
    await expect(page.locator("h1")).toContainText("confidentialité")
    await expect(page.getByRole("heading", { name: /RGPD/ })).toBeVisible()
  })

 test("Devis avec préremplissage métier (?metier=plombier)", async ({ page }) => {
   await page.goto("/devis?metier=plombier")
    await expect(page.locator("h1")).toContainText("Demande de devis décennale")
    await expect(page.locator("span.text-black.font-medium").filter({ hasText: "Plomberie sanitaire" })).toBeVisible()
  })

  test("Page assurance décennale métier — lien devis avec query metier", async ({ page }) => {
   await page.goto("/assurance-decennale/plombier")
   const link = page.getByRole("link", { name: /Devis Plombier personnalisé/i })
   await expect(link).toHaveAttribute("href", /metier=plombier/)
  })

  test("API verify JSON minimal sans detail", async ({ request }) => {
    const res = await request.get("/api/verify/OPT-DEC-2099-0001")
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()) as Record<string, unknown>
    expect(data).toHaveProperty("valid")
    expect(data).toHaveProperty("displayStatus")
    expect(data).not.toHaveProperty("clientName")
  })

  test("Souscription DO sans brouillon session → retour devis DO", async ({ page }) => {
    await page.goto("/souscription-dommage-ouvrage")
    await expect(page).toHaveURL(/devis-dommage-ouvrage/, { timeout: 15000 })
  })
})
