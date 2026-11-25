import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { selectNewDevisInbox } from "../lib/new-devis-inbox"
import {
  PARCOURS_DECENNALE_VIDE,
  libelleParcoursDecennale,
  parcoursDecennaleAbandonne,
  statutParcoursDecennale,
} from "../lib/parcours-decennale"

const vide = { ...PARCOURS_DECENNALE_VIDE }
assert.equal(statutParcoursDecennale(vide), "abandonne")
assert.equal(parcoursDecennaleAbandonne(vide), true)
assert.equal(libelleParcoursDecennale("abandonne"), "Parcours abandonné")

assert.equal(statutParcoursDecennale({ ...vide, hasUserAccount: true }), "en_cours")
assert.equal(statutParcoursDecennale({ ...vide, hasPendingSignature: true }), "en_cours")
assert.equal(parcoursDecennaleAbandonne({ ...vide, hasUserAccount: true }), false)

assert.equal(statutParcoursDecennale({ ...vide, hasPaidPayment: true }), "abouti")
assert.equal(statutParcoursDecennale({ ...vide, hasDecennaleContract: true }), "abouti")
assert.equal(statutParcoursDecennale({ ...vide, hasSignedContractDocument: true }), "abouti")
assert.equal(libelleParcoursDecennale("abouti"), "Parcours abouti")
assert.equal(libelleParcoursDecennale("en_cours"), "Parcours en cours")

const inbox = selectNewDevisInbox({
  devisLeads: [
    { id: "a", email: "abandon@example.com", raisonSociale: "Abandon", createdAt: "2026-11-20T00:00:00.000Z", parcours: "abandonne" },
    { id: "b", email: "encours@example.com", raisonSociale: "Cours", createdAt: "2026-11-20T00:00:00.000Z", parcours: "en_cours" },
    { id: "c", email: "abouti@example.com", raisonSociale: "Abouti", createdAt: "2026-11-20T00:00:00.000Z", parcours: "abouti" },
  ],
}, new Date("2026-11-25T00:00:00.000Z"))
assert.deepEqual(inbox.map((row) => row.email), ["abandon@example.com"])

const cron = readFileSync("app/api/cron/rappel-devis-abandonne/route.ts", "utf8")
const dashboard = readFileSync("app/api/gestion/dashboard/route.ts", "utf8")
const gestion = readFileSync("app/gestion/page.tsx", "utf8")
assert.ok(cron.includes("parcoursDecennaleAbandonne"))
assert.ok(cron.includes("progressedSkipped"))
assert.equal(cron.includes("userWithPayment"), false)
assert.ok(dashboard.includes('d.parcours !== "abandonne"'))
assert.ok(dashboard.includes("Parcours décennale abandonné"))
assert.ok(gestion.includes("Parcours abandonné"))
assert.ok(gestion.includes('lead.parcours === "abandonne"'))

console.log("parcours décennale abandonné : ok")
