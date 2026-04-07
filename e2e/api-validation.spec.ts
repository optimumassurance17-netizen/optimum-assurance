import { expect, test } from "@playwright/test"

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000"

test.describe("API validations critiques", () => {
  test("Webhook Mollie: payload vide accepté (ack 200)", async ({ request }) => {
    const res = await request.post("/api/mollie/webhook", {
      headers: { "content-type": "text/plain" },
      data: "",
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()) as { received?: boolean; ping?: boolean }
    expect(data.received).toBe(true)
    expect(data.ping).toBe(true)
  })

  test("Webhook Mollie: payload event JSON accepté sans traitement paiement", async ({ request }) => {
    const res = await request.post("/api/mollie/webhook", {
      data: { resource: "event", type: "payment.paid" },
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()) as { acknowledged?: string }
    expect(data.acknowledged).toBe("event_payload")
  })

  test("Webhook Mollie: form body sans id retourne no_payment_id", async ({ request }) => {
    const res = await request.post("/api/mollie/webhook", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: "foo=bar",
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()) as { acknowledged?: string }
    expect(data.acknowledged).toBe("no_payment_id")
  })

  test("Signature: JSON invalide rejeté en 400", async ({ request }) => {
    const res = await request.fetch("/api/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{invalid-json",
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/JSON invalide|Objet JSON attendu/i)
  })

  test("Signature: UUID invalide rejeté en 400", async ({ request }) => {
    const res = await request.post("/api/sign", {
      data: {
        documentId: "not-a-uuid",
        email: "test@example.com",
        signature: "data:image/png;base64,AAAA",
        agreed: true,
      },
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/Identifiant de document invalide/i)
  })

  test("Signature: image de signature invalide rejetée en 400", async ({ request }) => {
    const res = await request.post("/api/sign", {
      data: {
        documentId: VALID_UUID,
        email: "test@example.com",
        signature: "data:image/png;base64,AAAA",
        agreed: true,
      },
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/Signature vide|image invalide/i)
  })

  test("Enregistrement paiement: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/payments/record", {
      data: {
        molliePaymentId: "tr_test1234",
        amount: 100,
        status: "paid",
      },
    })
    expect(res.status()).toBe(401)
  })

  test("Création paiement Mollie: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/mollie/create-payment", {
      data: {
        amount: 120,
        redirectUrl: "https://example.com/confirmation",
        method: "creditcard",
      },
    })
    expect(res.status()).toBe(401)
  })

  test("Paiement contrat plateforme: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/contracts/pay", {
      data: {
        contractId: "c1234567890abcdef1234567",
      },
    })
    expect(res.status()).toBe(401)
  })

  test("Création demande signature: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/sign/create-request", {
      data: {
        souscription: {
          raisonSociale: "Entreprise Test",
          email: "test@example.com",
          representantLegal: "Jean Test",
        },
      },
    })
    expect(res.status()).toBe(401)
  })

  test("Devis calculate: JSON invalide rejeté en 400", async ({ request }) => {
    const res = await request.fetch("/api/devis/calculate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{invalid-json",
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/JSON invalide|Objet JSON attendu/i)
  })

  test("Reset password: JSON invalide rejeté en 400", async ({ request }) => {
    const res = await request.fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{invalid-json",
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/JSON invalide|Objet JSON attendu/i)
  })

  test("Forgot password: JSON invalide rejeté en 400", async ({ request }) => {
    const res = await request.fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{invalid-json",
    })
    expect(res.status()).toBe(400)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/JSON invalide|Objet JSON attendu/i)
  })
})
