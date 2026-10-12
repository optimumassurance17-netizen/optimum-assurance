import { expect, test, type Page } from "@playwright/test"

const CLIENT_SESSION = {
  user: {
    id: "client_1",
    email: "client@example.com",
    name: "Client Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

function devisDocument(type: "devis" | "devis_do" | "contrat", id = "doc_devis_1") {
  return {
    id,
    type,
    numero: type === "contrat" ? "CTR-2026-001" : type === "devis_do" ? "DO-2026-004" : "DEC-2026-001",
    status: "valide",
    allowDevisEdition: false,
    data: {
      raisonSociale: "SCA Démo",
      primeAnnuelle: 3200,
    },
  }
}

async function mockSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("optimum-cookies-consent", "1")
  })
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CLIENT_SESSION),
    })
  })
}

async function mockClientApis(page: Page, draftDeletes: string[]) {
  await page.route("**/api/client/**", async (route) => {
    const url = route.request().url()
    if (url.includes("/api/client/devis-drafts")) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "absent" }),
    })
  })
  await page.route("**/api/client/devis-drafts**", async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === "DELETE") {
      draftDeletes.push(url.pathname)
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
      body: JSON.stringify({
        drafts: [
          {
            id: "draft_1",
            token: "token-brouillon",
            produit: "decennale",
            createdAt: "2026-10-01T08:00:00.000Z",
            expiresAt: "2026-11-01T08:00:00.000Z",
            raisonSociale: "SCA Brouillon",
            siret: "12345678900011",
            primeAnnuelle: 2400,
          },
        ],
      }),
    })
  })
}

test.describe("Espace client — supprimer un devis", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page)
  })

  test("supprime un devis et un brouillon, et laisse le contrat et le PDF généré", async ({ page }) => {
    const documentDeletes: string[] = []
    const draftDeletes: string[] = []
    await mockClientApis(page, draftDeletes)
    await page.route("**/api/documents/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "doc_devis_1",
            type: "devis",
            numero: "DEC-2026-001",
            status: "valide",
            createdAt: "2026-10-02T08:00:00.000Z",
          },
          {
            id: "doc_devis_paye",
            type: "devis_do",
            numero: "DO-2026-009",
            status: "valide",
            createdAt: "2026-10-03T08:00:00.000Z",
          },
          {
            id: "doc_contrat_1",
            type: "contrat",
            numero: "CTR-2026-001",
            status: "valide",
            createdAt: "2026-10-04T08:00:00.000Z",
          },
          {
            id: "contract-virtual:c1:quote",
            type: "devis_do",
            numero: "DO-GEN-1 — Devis",
            status: "approved",
            createdAt: "2026-10-05T08:00:00.000Z",
            href: "/api/contracts/c1/pdf/quote",
            generated: true,
          },
        ]),
      })
    })
    await page.route("**/api/documents/doc_devis_1", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback()
        return
      }
      documentDeletes.push("doc_devis_1")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/documents/doc_devis_paye", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback()
        return
      }
      documentDeletes.push("doc_devis_paye")
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Ce devis a un paiement en cours ou déjà encaissé. Il ne peut plus être supprimé.",
        }),
      })
    })

    await page.goto("/espace-client")
    await expect(page.getByRole("heading", { name: "Mon espace client" })).toBeVisible()

    const contrat = page.getByRole("link", { name: /CTR-2026-001/ })
    await expect(contrat).toBeVisible()
    await expect(contrat.locator("..").getByRole("button", { name: /Supprimer/ })).toHaveCount(0)

    const generated = page.getByRole("link", { name: /DO-GEN-1/ })
    await expect(generated).toBeVisible()
    await expect(generated.locator("..").getByRole("button", { name: /Supprimer/ })).toHaveCount(0)

    await page.getByRole("button", { name: "Supprimer le devis DEC-2026-001" }).click()
    await page.getByRole("button", { name: "Annuler la suppression du devis DEC-2026-001" }).click()
    await expect(page.getByRole("button", { name: "Confirmer la suppression du devis DEC-2026-001" })).toHaveCount(0)
    expect(documentDeletes).toEqual([])

    await page.getByRole("button", { name: "Supprimer le devis DEC-2026-001" }).click()
    await page.getByRole("button", { name: "Confirmer la suppression du devis DEC-2026-001" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Devis supprimé." })).toBeVisible()
    await expect(page.getByRole("link", { name: /DEC-2026-001/ })).toHaveCount(0)
    expect(documentDeletes).toEqual(["doc_devis_1"])

    await page.getByRole("button", { name: "Supprimer le devis DO-2026-009" }).click()
    await page.getByRole("button", { name: "Confirmer la suppression du devis DO-2026-009" }).click()
    await expect(page.getByRole("alert")).toContainText("paiement en cours ou déjà encaissé")
    await expect(page.getByRole("link", { name: /DO-2026-009/ })).toBeVisible()

    await page.getByRole("button", { name: "Supprimer le devis enregistré SCA Brouillon" }).click()
    await page.getByRole("button", { name: "Confirmer la suppression du devis enregistré SCA Brouillon" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Devis enregistré supprimé." })).toBeVisible()
    await expect(page.getByText("SCA Brouillon")).toHaveCount(0)
    expect(draftDeletes.some((path) => path.endsWith("/draft_1"))).toBe(true)
  })

  test("le bouton Supprimer reste dans l'écran sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockClientApis(page, [])
    await page.route("**/api/documents/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "doc_devis_1",
            type: "devis",
            numero: "DEC-2026-001",
            status: "valide",
            createdAt: "2026-10-02T08:00:00.000Z",
          },
        ]),
      })
    })

    await page.goto("/espace-client")
    const button = page.getByRole("button", { name: "Supprimer le devis DEC-2026-001" })
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)

    await button.click()
    const confirm = page.getByRole("button", { name: "Confirmer la suppression du devis DEC-2026-001" })
    await expect(confirm).toBeVisible()
    const confirmBox = await confirm.boundingBox()
    expect(confirmBox).toBeTruthy()
    expect(confirmBox!.x).toBeGreaterThanOrEqual(0)
    expect(confirmBox!.x + confirmBox!.width).toBeLessThanOrEqual(390)
  })

  test("la fiche devis confirme la suppression puis revient à l'espace client", async ({ page }) => {
    const documentDeletes: string[] = []
    await mockClientApis(page, [])
    await page.route("**/api/documents/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      })
    })
    await page.route("**/api/documents/doc_devis_do", async (route) => {
      if (route.request().method() === "DELETE") {
        documentDeletes.push("doc_devis_do")
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
        body: JSON.stringify(devisDocument("devis_do", "doc_devis_do")),
      })
    })

    await page.goto("/espace-client/documents/doc_devis_do")
    await page.getByRole("button", { name: "Supprimer le devis", exact: true }).click()
    await page.getByRole("button", { name: "Confirmer la suppression du devis", exact: true }).click()
    await expect(page).toHaveURL(/\/espace-client\/?$/)
    await expect(page.getByRole("heading", { name: "Mon espace client" })).toBeVisible()
    expect(documentDeletes).toEqual(["doc_devis_do"])
  })

  test("un contrat ne propose pas la suppression et un refus reste affiché", async ({ page }) => {
    await page.route("**/api/documents/doc_contrat_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(devisDocument("contrat", "doc_contrat_1")),
      })
    })
    await page.goto("/espace-client/documents/doc_contrat_1")
    await expect(page.getByRole("heading", { name: "Modifier le devis / contrat" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Supprimer/ })).toHaveCount(0)

    await page.route("**/api/documents/doc_devis_1", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Une signature est en cours pour ce devis. Il ne peut plus être supprimé.",
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(devisDocument("devis")),
      })
    })
    await page.goto("/espace-client/documents/doc_devis_1")
    await page.getByRole("button", { name: "Supprimer le devis", exact: true }).click()
    await page.getByRole("button", { name: "Confirmer la suppression du devis", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("signature est en cours")
    await expect(page).toHaveURL(/\/espace-client\/documents\/doc_devis_1/)
  })
})
