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

async function mockAdminSession(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "admin_e2e",
          email: "admin@example.com",
          name: "Administrateur",
          isAdmin: true,
        },
        expires: "2099-01-01T00:00:00.000Z",
      }),
    })
  })
}

test.describe("Parcours devis → paiement → attestation", () => {
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

  test("Devis décennale : une session admin ne préremplit pas l'email client", async ({ page }) => {
    await mockAdminSession(page)
    await page.route("**/api/client/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "admin@example.com",
          siret: "73282932000074",
          raisonSociale: "Administrateur",
        }),
      })
    })

    await page.goto("/devis")
    await dismissCookieBanner(page)

    await page.locator('input[type="number"]').first().fill("80000")
    await page.locator("#categorie-selection").selectOption({ label: "Toutes les catégories" })
    await page.locator("#activite-recherche").fill("plomberie")
    await page.locator("#activite-selection").selectOption("Plomberie sanitaire")
    await page.getByRole("button", { name: "Ajouter" }).click()

    await expect(page.getByRole("heading", { name: "Votre tarification" })).toBeVisible()
    await expect(page.locator("#email-devis-save")).toHaveValue("")
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
