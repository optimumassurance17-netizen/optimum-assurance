import { expect, test } from "@playwright/test"

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

    await page.getByRole("button", { name: "Envoyer ma demande" }).click()

    await expect(page.getByText("Demande envoyée")).toBeVisible()
    await expect(page.getByText(/24 à 48 h ouvrées/i)).toBeVisible()
  })
})
