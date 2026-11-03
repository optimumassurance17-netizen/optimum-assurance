import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolveManualRcPaymentStep } from "../lib/rc-manual-payment"

const first = resolveManualRcPaymentStep({
  contractId: "ctr_rc",
  status: "approved",
  paidAt: null,
  paidPaymentIds: [],
  hasCertificate: false,
})
assert.equal(first.ok, true)
if (!first.ok) throw new Error("premier virement")
assert.equal(first.kind, "first")
assert.equal(first.reference, "manual-rc-ctr_rc-1")

const retry = resolveManualRcPaymentStep({
  contractId: "ctr_rc",
  status: "active",
  paidAt: "2026-11-03T10:00:00.000Z",
  paidPaymentIds: ["manual-rc-ctr_rc-1"],
  hasCertificate: false,
})
assert.equal(retry.ok && retry.kind === "retry" && retry.reference, "manual-rc-ctr_rc-1")

const next = resolveManualRcPaymentStep({
  contractId: "ctr_rc",
  status: "active",
  paidAt: "2026-11-03T10:00:00.000Z",
  paidPaymentIds: ["manual-rc-ctr_rc-1"],
  hasCertificate: true,
})
assert.equal(next.ok && next.kind === "next" && next.reference, "manual-rc-ctr_rc-2")

const blocked = resolveManualRcPaymentStep({
  contractId: "ctr_dec",
  status: "approved",
  paidAt: "2026-11-03T10:00:00.000Z",
  paidPaymentIds: ["pay_1"],
  hasCertificate: true,
})
assert.equal(blocked.ok, false)

const service = readFileSync("lib/insurance-contract-service.ts", "utf8")
const route = readFileSync("app/api/gestion/insurance-contracts/[id]/validate-rc-payment/route.ts", "utf8")
const button = readFileSync("components/gestion/ValidateRcPaymentButton.tsx", "utf8")
const gestion = readFileSync("components/gestion/InsuranceContractsGestionBlock.tsx", "utf8")
const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
const search = readFileSync("components/gestion/ClientQuickSearch.tsx", "utf8")
const email = readFileSync("lib/email.ts", "utf8")

assert(service.includes("current.productType !== \"rc_fabriquant\""), "seul le contrat RC est validé par cette action")
assert(service.includes("validateRcFabriquantPaymentManually"), "le service enregistre le virement")
assert(service.includes("processInsuranceContractPaymentSuccess"), "le virement actif le contrat et l'attestation")
assert(route.includes("isAdmin"), "seul un administrateur valide le virement")
assert(route.includes("normalizeVirementReference"), "le libellé du virement est nettoyé")
assert(route.includes("confirmationPaiementRcManuel"), "le client reçoit la confirmation")
assert(button.includes("Virement reçu"), "le bouton reprend le libellé de la décennale")
assert(button.includes("Générer l'attestation"), "l'attestation peut être relancée")
assert(gestion.includes("ValidateRcPaymentButton"), "le tableau des contrats propose le virement")
assert(fiche.includes("ValidateRcPaymentButton"), "la fiche client propose le virement")
assert(search.includes("ValidateRcPaymentButton"), "la recherche propose le virement")
assert(email.includes("confirmationPaiementRcManuel"), "l'email de virement RC existe")
assert(service.includes("current.productType !== \"do\""), "le paiement manuel du dommage ouvrage reste séparé")

console.log("verify-rc-manual-payment: ok")
