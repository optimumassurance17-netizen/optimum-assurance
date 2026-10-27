import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { frenchStatusLabel } from "../lib/status-labels"

assert.equal(frenchStatusLabel("valide"), "Valide")
assert.equal(frenchStatusLabel("suspendu"), "Suspendu")
assert.equal(frenchStatusLabel("resilie"), "Résilié")
assert.equal(frenchStatusLabel("perimee"), "Périmée")
assert.equal(frenchStatusLabel("draft"), "Brouillon")
assert.equal(frenchStatusLabel("pending_validation"), "En validation")
assert.equal(frenchStatusLabel("approved"), "Approuvé")
assert.equal(frenchStatusLabel("paid"), "Payé")
assert.equal(frenchStatusLabel("active"), "Actif")
assert.equal(frenchStatusLabel("rejected"), "Refusé")
assert.equal(frenchStatusLabel("pending"), "En attente")
assert.equal(frenchStatusLabel("failed"), "Échoué")
assert.equal(frenchStatusLabel("pending_mandate"), "Mandat en attente")
assert.equal(frenchStatusLabel("cancelled"), "Annulé")
assert.equal(frenchStatusLabel("code-inconnu"), "code-inconnu")
assert.equal(frenchStatusLabel("  "), "")

const rcOptions = readFileSync("src/modules/rcpro/components/RcProOptions.tsx", "utf8")
assert.match(rcOptions, /Protection juridique renforcée \(\+20 €\)/)
assert.match(rcOptions, /Cyber assistance \(\+35 €\)/)
assert.match(rcOptions, /Défense \/ recours Plus \(\+8 %\)/)
assert.doesNotMatch(rcOptions, /label: "[^"]*(?:renforcee|Defense|EUR)/)

const rcResult = readFileSync("app/devis/rcpro/result/page.tsx", "utf8")
assert.match(rcResult, /toLocaleString\("fr-FR"\)\} €/)
assert.doesNotMatch(rcResult, /\bEUR\b/)

const cookieBanner = readFileSync("components/CookieBanner.tsx", "utf8")
assert.match(cookieBanner, /\/gestion/)
assert.match(cookieBanner, /\/espace-client/)
assert.match(cookieBanner, /if \(hidden \|\| !visible\) return null/)

for (const file of [
  "app/gestion/page.tsx",
  "app/gestion/clients/[id]/page.tsx",
  "app/espace-client/page.tsx",
  "components/gestion/InsuranceContractsGestionBlock.tsx",
  "app/verify/[contractNumber]/page.tsx",
]) {
  const source = readFileSync(file, "utf8")
  assert.match(source, /frenchStatusLabel/, `${file} affiche un libellé français`)
}

const doLabel = readFileSync("components/gestion/ValidateDoPaymentButton.tsx", "utf8")
assert.match(doLabel, /return frenchStatusLabel\(contract\.status\)/)
assert.match(doLabel, /Approuvé, en attente d'encaissement/)

console.log("Libellés de statut et affichage RC Pro OK")
