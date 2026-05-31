import { test, expect } from "@playwright/test"

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const acceptBtn = page.getByRole("button", { name: "Accepter" })
  try {
    await acceptBtn.click({ timeout: 2000 })
  } catch {
    // Bandeau absent ou déjà accepté
  }
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
