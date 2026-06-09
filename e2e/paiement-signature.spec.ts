import { test, expect } from "@playwright/test"

const AUTHENTICATED_SESSION = {
  user: {
    id: "user_e2e",
    email: "prospect@example.com",
    name: "Prospect Optimum",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

const DECENNALE_SOUSCRIPTION = {
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

const DECENNALE_SIGNATURE_PAYLOAD = {
  ...DECENNALE_SOUSCRIPTION,
  signedContractNumero: "CTR-TEST-RESUME-001",
  signedContractData: {
    numero: "CTR-TEST-RESUME-001",
    raisonSociale: DECENNALE_SOUSCRIPTION.raisonSociale,
  },
} as const

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const acceptBtn = page.getByRole("button", { name: "Accepter" })
  try {
    await acceptBtn.click({ timeout: 2000 })
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

test.describe("Tunnel signature et paiement", () => {
  test("Décennale : signature -> mandat SEPA -> paiement -> confirmation", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.route("**/api/devoir-conseil/log", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/sign/create-request", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          signatureRequestId: "sig_test_123",
          contractNumero: "CTR-TEST-001",
          contractData: { numero: "CTR-TEST-001" },
          signatureLink: "/signature/callback?success=1",
        }),
      })
    })

    await page.route("**/api/mollie/create-payment", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pay_test_123",
          checkoutUrl: "/confirmation?payment_id=pay_test_123",
        }),
      })
    })

    await page.route("**/api/mollie/payment-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "paid",
          amount: 360,
          metadata: {},
        }),
      })
    })

    await page.route("**/api/payments/record", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/documents/create", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/email/confirmation-souscription", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.addInitScript((payload) => {
      window.sessionStorage.setItem("optimum-souscription", JSON.stringify(payload))
    }, DECENNALE_SOUSCRIPTION)

    await page.goto("/signature")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "Signature numérique" })).toBeVisible()

    const signButton = page.getByRole("button", { name: "Signer le contrat (contrat type)" })
    await expect(signButton).toBeDisabled()

    await page.locator("#devoir-conseil-signature").check()
    await expect(signButton).toBeEnabled()

    await signButton.click()

    await expect(page).toHaveURL(/\/signature\/callback\?success=1/)
    await expect(page.getByRole("heading", { name: "Signature enregistrée" })).toBeVisible()

    await page.getByRole("link", { name: "Mandat SEPA (déjà connecté)" }).click()

    await expect(page).toHaveURL(/\/mandat-sepa$/)
    await expect(page.getByRole("heading", { name: "IBAN et mandat SEPA" })).toBeVisible()

    await page.getByPlaceholder("FR76 1234 5678 9012 3456 7890 123").fill("FR7630006000011234567890189")
    await page.getByPlaceholder("Nom du titulaire ou raison sociale").fill("Jean Test")
    await page.locator("#sepa-mandat").check()

    await page.getByRole("button", { name: "Continuer vers le paiement" }).click()

    await expect(page).toHaveURL(/\/paiement$/)
    await expect(page.getByRole("heading", { name: "Paiement" })).toBeVisible()
    await expect(page.getByText("Paiement sécurisé par Mollie")).toBeVisible()

    await page.getByRole("button", { name: "Payer le 1er trimestre par carte" }).click()

    await expect(page).toHaveURL(/\/confirmation\?payment_id=pay_test_123/)
    await expect(page.getByRole("heading", { name: "Souscription confirmée" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Accéder à mon espace client" })).toBeVisible()
  })

  test("Décennale : reprise mandat/paiement sans sessionStorage après signature", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.route("**/api/client/decennale-paiement-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          available: true,
          contratNumero: DECENNALE_SIGNATURE_PAYLOAD.signedContractNumero,
          signaturePayload: DECENNALE_SIGNATURE_PAYLOAD,
        }),
      })
    })

    let createPaymentBody: Record<string, unknown> | null = null
    await page.route("**/api/mollie/create-payment", async (route) => {
      createPaymentBody = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pay_test_resume_123",
          checkoutUrl: "/confirmation?payment_id=pay_test_resume_123",
        }),
      })
    })
    await page.route("**/api/mollie/payment-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "paid",
          amount: 360,
          metadata: {},
        }),
      })
    })
    await page.route("**/api/payments/record", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/documents/create", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.route("**/api/email/confirmation-souscription", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto("/mandat-sepa")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "IBAN et mandat SEPA" })).toBeVisible()
    await expect(page.getByText(DECENNALE_SIGNATURE_PAYLOAD.raisonSociale)).toBeVisible()

    await page.getByPlaceholder("FR76 1234 5678 9012 3456 7890 123").fill("FR7630006000011234567890189")
    await page.getByPlaceholder("Nom du titulaire ou raison sociale").fill("Jean Test")
    await page.locator("#sepa-mandat").check()
    await page.getByRole("button", { name: "Continuer vers le paiement" }).click()

    await expect(page).toHaveURL(/\/paiement$/)
    await expect(page.getByRole("heading", { name: "Paiement" })).toBeVisible()

    await page.getByRole("button", { name: "Payer le 1er trimestre par carte" }).click()

    await expect(page).toHaveURL(/\/confirmation\?payment_id=pay_test_resume_123/)
    expect(createPaymentBody).not.toBeNull()
    expect(
      (createPaymentBody?.metadata as { contractNumero?: string } | undefined)?.contractNumero
    ).toBe("CTR-TEST-RESUME-001")
  })

  test("DO : confirmation de paiement contrat plateforme", async ({ page }) => {
    await page.route("**/api/mollie/payment-status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "paid",
          metadata: { type: "insurance_contract" },
        }),
      })
    })

    await page.addInitScript(() => {
      window.sessionStorage.setItem("mollie_payment_id", "pay_do_contract_123")
      window.sessionStorage.setItem("mollie_payment_type", "insurance_contract")
    })

    await page.goto("/confirmation")
    await dismissCookieBanner(page)

    await expect(page.getByRole("heading", { name: "Paiement enregistré" })).toBeVisible()
    await expect(page.getByText(/contrat plateforme/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Accéder à mon espace client" })).toBeVisible()
  })
})
