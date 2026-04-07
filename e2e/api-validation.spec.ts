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

  test("Gestion documents create: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/documents/create", {
      data: { userId: "c123", type: "devis" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion documents status: route protégée sans session", async ({ request }) => {
    const res = await request.patch("/api/gestion/documents/test-id/status", {
      data: { status: "suspendu" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion client patch: route protégée sans session", async ({ request }) => {
    const res = await request.patch("/api/gestion/clients/test-id", {
      data: { raisonSociale: "Nouvelle société" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion résiliation patch: route protégée sans session", async ({ request }) => {
    const res = await request.patch("/api/gestion/resiliation-requests/test-id", {
      data: { action: "approve" },
    })
    expect(res.status()).toBe(403)
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

  test("Gestion signature depuis devis: route admin protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/sign/send-from-devis", {
      data: { documentId: "doc_test" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion création user depuis lead: route admin protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/users/create-from-lead", {
      data: { leadId: "lead_test" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion création avenant: route admin protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/avenants", {
      data: {
        userId: "user_test",
        contractNumero: "CTR-TEST",
        modifications: { primeAnnuelle: 1000 },
      },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion création sinistre: route admin protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/clients/user_test/sinistres", {
      data: { dateSinistre: "2026-01-01" },
    })
    expect(res.status()).toBe(403)
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

  test("Forgot password: JSON invalide ne révèle pas d'information (ok=true)", async ({ request }) => {
    const res = await request.fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: "{invalid-json",
    })
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { ok?: boolean }
    expect(data.ok).toBe(true)
  })

  test("Gestion remises étude: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/etude/remise", {
      data: {
        etudeLeadId: "lead_123",
        primeAnnuelle: 1200,
      },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion notes client: route protégée sans session", async ({ request }) => {
    const res = await request.post("/api/gestion/clients/abc123/notes", {
      data: { content: "Note test" },
    })
    expect(res.status()).toBe(403)
  })

  test("Gestion contrats patch: route protégée sans session", async ({ request }) => {
    const res = await request.fetch("/api/gestion/insurance-contracts/abc123", {
      method: "PATCH",
      data: { premium: 1500 },
    })
    expect(res.status()).toBe(403)
  })
})
