import { readFileSync } from "node:fs"
import { DO_DOSSIER_VALIDE_MESSAGE } from "../lib/do-dossier-valide"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

assert(
  DO_DOSSIER_VALIDE_MESSAGE.includes("Votre dossier est validé"),
  "le message dit que le dossier est validé"
)
assert(
  DO_DOSSIER_VALIDE_MESSAGE.includes("procès-verbal de réception"),
  "le message demande le procès-verbal de réception"
)
assert(
  DO_DOSSIER_VALIDE_MESSAGE.includes("fin du chantier"),
  "le procès-verbal est demandé à la fin du chantier"
)

const email = readFileSync("lib/email.ts", "utf8")
assert(email.includes("dossierDoValide"), "l'email de paiement peut porter le message DO")
assert(email.includes("DO_DOSSIER_VALIDE_MESSAGE"), "l'email reprend le message du dossier validé")

const request = readFileSync("app/api/gestion/insurance-contracts/[id]/request-payment/route.ts", "utf8")
assert(
  request.includes('dossierDoValide: contract.productType === "do"'),
  "la validation de la demande de paiement DO ajoute le message"
)

const cron = readFileSync("app/api/cron/rappel-paiements-contrats/route.ts", "utf8")
assert(
  cron.includes('dossierDoValide: contract.productType === "do"'),
  "le rappel de paiement DO garde le même message"
)

const gestion = readFileSync("components/gestion/InsuranceContractsGestionBlock.tsx", "utf8")
assert(gestion.includes("DO_DOSSIER_VALIDE_MESSAGE"), "la gestion confirme le message après l'envoi")
assert(gestion.includes('c.productType === "do"'), "le message de confirmation reste réservé à la DO")

const client = readFileSync("app/espace-client/page.tsx", "utf8")
assert(client.includes("DO_DOSSIER_VALIDE_MESSAGE"), "l'espace client affiche le message sur le dossier DO")

const banner = readFileSync("components/insurance/InsuranceContractParcoursBanner.tsx", "utf8")
assert(banner.includes("DO_DOSSIER_VALIDE_MESSAGE"), "le parcours DO affiche le message au moment du paiement")

console.log("verify-do-dossier-valide: ok")
