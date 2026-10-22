import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const service = readFileSync("lib/insurance-contract-service.ts", "utf8")
const route = readFileSync("app/api/gestion/insurance-contracts/[id]/validate-do-payment/route.ts", "utf8")
const gestion = readFileSync("components/gestion/InsuranceContractsGestionBlock.tsx", "utf8")
const button = readFileSync("components/gestion/ValidateDoPaymentButton.tsx", "utf8")
const search = readFileSync("app/api/gestion/clients/search/route.ts", "utf8")
const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
const email = readFileSync("lib/email.ts", "utf8")

assert(service.includes("export function manualDoPaymentReference"), "la référence manuelle est stable")
assert(service.includes("manual-do-${contractId}"), "la référence ne se confond pas avec un paiement Mollie")
assert(service.includes("current.productType !== \"do\""), "seul le dommage ouvrage est validé à la main")
assert(
  service.includes("processInsuranceContractPaymentSuccess"),
  "la validation manuelle active le contrat comme un paiement reçu"
)
assert(route.includes("validateDoPaymentManually"), "la route gestion appelle la validation DO")
assert(route.includes("isAdmin"), "seul un administrateur valide le paiement")
assert(route.includes("confirmationPaiementDoManuel"), "le client reçoit la confirmation d'encaissement")
assert(button.includes("Valider le paiement"), "le bouton est visible dans la gestion")
assert(gestion.includes("canValidateDoPaymentManually"), "le tableau des contrats propose la validation")
assert(fiche.includes("ValidateDoPaymentButton"), "la fiche client propose la validation")
assert(search.includes("clientName: { contains: rawQuery, mode: \"insensitive\" }"), "la recherche retrouve la société du contrat")
assert(
  button.includes("contract.status === CONTRACT_STATUS.approved && !contract.paidAt"),
  "le bouton apparaît pour un DO approuvé et non payé"
)
assert(
  button.includes("contract.hasCertificate === false"),
  "le bouton reste disponible si l'attestation n'a pas été générée"
)
assert(email.includes("confirmationPaiementDoManuel"), "l'email de paiement manuel existe")
assert(!route.includes("productType !== \"decennale\""), "la route ne valide pas une décennale")

console.log("Validation manuelle du paiement DO : vérifications OK")
