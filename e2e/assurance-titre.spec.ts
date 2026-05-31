import { expect, test } from "@playwright/test"

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const acceptButton = page.getByRole("button", { name: "Accepter" })
  try {
    await acceptButton.click({ timeout: 2000 })
  } catch {
    /* ignore */
  }
}

test.describe("Assurance titre", () => {
  test("page disponible et formulaire envoyable", async ({ page }) => {
    await page.route("**/api/devis-assurance-titre", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/assurance-titre")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "Assurance titre immobilière" })).toBeVisible()

    await page.getByLabel(/E-mail de contact/i).fill("marie.dupont@example.com")
    await page.getByLabel(/Téléphone/i).fill("0612345678")
    await page.getByLabel(/Nom et prénom \/ interlocuteur/i).fill("Marie Dupont")
    await page.getByLabel(/Profil du souscripteur/i).selectOption("investisseur")
    await page.getByLabel(/Type d'opération/i).selectOption("acquisition")
    await page.getByLabel(/Type de bien/i).selectOption("immeuble")
    await page.getByLabel(/Besoin principal/i).selectOption("securisation_transaction")
    await page.getByLabel(/Adresse du bien/i).fill("12 rue des Fleurs")
    await page.getByLabel(/Code postal/i).fill("75008")
    await page.getByLabel(/^Ville/i).fill("Paris")
    await page.getByLabel(/Montant de l'opération/i).fill("850000")
    await page.getByLabel(/J'accepte que mes données soient utilisées/i).check()

    const submitButton = page.getByRole("button", { name: "Envoyer ma demande" })
    await expect(submitButton).toBeEnabled()
    const formValidity = await submitButton.evaluate((button) => {
      const form = button.closest("form") as HTMLFormElement | null
      if (!form) return { hasForm: false, isValid: false, invalid: [] as string[] }
      const invalid = Array.from(form.elements)
        .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          "validity" in element && "validationMessage" in element
        )
        .filter((element) => !element.validity.valid)
        .map((element) => `${element.getAttribute("id") || element.getAttribute("name") || element.tagName}:${element.validationMessage}`)
      return { hasForm: true, isValid: form.checkValidity(), invalid }
    })

    expect(formValidity.hasForm).toBeTruthy()
    expect(formValidity.isValid, JSON.stringify(formValidity.invalid)).toBeTruthy()

    const [response] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/devis-assurance-titre")),
      submitButton.evaluate((button) => {
        const form = button.closest("form") as HTMLFormElement | null
        form?.requestSubmit()
      }),
    ])

    expect(response.ok()).toBeTruthy()

    await expect(page.getByText("Demande envoyée")).toBeVisible()
    await expect(page.getByText(/Nous avons bien reçu votre demande d'étude/i)).toBeVisible()
    await expect(page.getByText(/Créer mon espace client/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /J'ai déjà un compte/i })).toBeVisible()
  })

  test("espace client assurance titre redirige vers la connexion si non authentifié", async ({ page }) => {
    await page.goto("/espace-client/assurance-titre")
    await expect(page).toHaveURL(/\/connexion\?callbackUrl=%2Fespace-client%2Fassurance-titre/, {
      timeout: 15000,
    })
  })
})
