import { expect, test } from "@playwright/test"

const CLIENT_SESSION = {
  user: {
    id: "client_1",
    email: "client@example.com",
    name: "Client Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

function devisDocument(allowDevisEdition: boolean) {
  return {
    id: "doc_devis_1",
    type: "devis",
    numero: "DEC-2026-001",
    status: "brouillon",
    allowDevisEdition,
    data: {
      raisonSociale: "SCA Démo",
      siret: "12345678900011",
      adresse: "10 rue de Paris",
      codePostal: "75001",
      ville: "Paris",
      activites: ["Maçonnerie"],
      chiffreAffaires: 120000,
      primeAnnuelle: 3200,
      franchise: 1000,
      plafond: 160000,
    },
  }
}

test.describe("Espace client — modification du devis", () => {
  test("Un devis non autorisé reste fermé, un devis autorisé s'ouvre", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CLIENT_SESSION),
      })
    })

    let allowDevisEdition = false
    await page.route("**/api/documents/doc_devis_1", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "La modification de ce devis n'est pas autorisée. Contactez la gestion.",
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(devisDocument(allowDevisEdition)),
      })
    })

    await page.goto("/espace-client/documents/doc_devis_1")
    await expect(page.getByRole("heading", { name: "Modifier le devis / contrat" })).toBeVisible()
    await expect(page.getByText("Elles ne modifient pas l'email de connexion.")).toBeVisible()
    await expect(
      page.getByText("Modification verrouillée. La gestion peut autoriser ce devis depuis la fiche client.")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Modifier" })).toBeDisabled()

    allowDevisEdition = true
    await page.reload()
    await expect(page.getByRole("heading", { name: "Modifier le devis / contrat" })).toBeVisible()
    await expect(page.getByText("Modification verrouillée.")).toHaveCount(0)
    await page.getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByPlaceholder("Raison sociale")).toHaveValue("SCA Démo")
  })
})
