import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { DeclarerSinistreCard } from "@/components/espace-client/DeclarerSinistreCard"
import {
  clientSinistreContractOptions,
  formatClientSinistreDescription,
  parseClientSinistreDeclaration,
} from "@/lib/client-sinistre-declaration"

const now = new Date("2026-10-11T12:00:00.000Z")

const missing = parseClientSinistreDeclaration({ dateSinistre: "", description: "trop court" }, now)
assert.equal(missing.ok, false)

const future = parseClientSinistreDeclaration(
  { dateSinistre: "2026-10-12", description: "Un dégât des eaux est apparu dans l'atelier." },
  now
)
assert.equal(future.ok, false)

const short = parseClientSinistreDeclaration({ dateSinistre: "2026-10-01", description: "court" }, now)
assert.equal(short.ok, false)

const badAmount = parseClientSinistreDeclaration(
  {
    dateSinistre: "2026-10-01",
    description: "Un dégât des eaux est apparu dans l'atelier.",
    montantEstime: -5,
  },
  now
)
assert.equal(badAmount.ok, false)

const ok = parseClientSinistreDeclaration(
  {
    dateSinistre: "2026-10-01",
    description: "Un dégât des eaux est apparu dans l'atelier après la livraison.",
    contractNumber: "RCFAB-1",
    montantEstime: "1500",
  },
  now
)
assert.equal(ok.ok, true)
if (!ok.ok) throw new Error("déclaration attendue")
assert.equal(ok.value.montantEstime, 1500)
const stored = formatClientSinistreDescription(ok.value)
assert.match(stored, /Déclaration du client/)
assert.match(stored, /Contrat : RCFAB-1/)
assert.match(stored, /Montant estimé : 1[\s\u00a0\u202f]*500 €/)
assert.match(stored, /dégât des eaux/)

const options = clientSinistreContractOptions({
  contracts: [{ contractNumber: "RCFAB-1", productType: "rc_fabriquant" }],
  documents: [
    { numero: "RCFAB-1", type: "contrat" },
    { numero: "DEC-9", type: "attestation" },
    { numero: "DEVIS-1", type: "devis" },
  ],
})
assert.deepEqual(
  options.map((option) => option.number),
  ["RCFAB-1", "DEC-9"]
)
assert.match(options[0].label, /RC Fabriquant/)

const route = readFileSync("app/api/client/sinistres/route.ts", "utf8")
assert.match(route, /session\.user\.id/)
assert.match(route, /getDevisAlertRecipientEmails/)
assert.match(route, /montantIndemnisation: null/)
assert.doesNotMatch(route, /payments\.create|paymentLinks\.create/)
assert.doesNotMatch(route, /userId:\s*payload|userId:\s*body/)

const page = readFileSync("app/espace-client/page.tsx", "utf8")
const card = readFileSync("components/espace-client/DeclarerSinistreCard.tsx", "utf8")
assert.match(page, /DeclarerSinistreCard/)
assert.match(card, /Déclarer un sinistre/)
assert.match(card, /Envoyer la déclaration/)
assert.match(card, /\/api\/client\/sinistres/)
assert.doesNotMatch(card, /payments\.create/)

const html = renderToStaticMarkup(
  createElement(DeclarerSinistreCard, {
    contracts: [{ contractNumber: "RCFAB-1", productType: "rc_fabriquant" }],
    documents: [{ numero: "DEC-9", type: "attestation" }],
  })
)
assert.match(html, /Déclarer un sinistre/)
assert.match(html, /id="declarer-sinistre"/)
assert.match(html, /ne vaut pas acceptation de garantie/)

console.log("verify-client-sinistre: ok")
