import { readFileSync } from "node:fs"
import { decideDecennaleReprise, safeRepriseHref } from "../lib/decennale-reprise"
import { premierTrimestrePaymentMatches } from "../lib/client-echeances"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const signature = decideDecennaleReprise({
  pendingSignatureHref: "/sign/abc?next=%2Fmandat-sepa",
  hasContract: true,
  contractDataUsable: true,
  firstPaymentDone: false,
  draftResumeHref: "/devis/resume/tok",
  hasDoJourney: false,
})
assert(signature.step === "signature" && signature.href.startsWith("/sign/abc"), "une signature en attente reprend le document")

const mandat = decideDecennaleReprise({
  pendingSignatureHref: null,
  hasContract: true,
  contractDataUsable: true,
  firstPaymentDone: false,
  draftResumeHref: null,
  hasDoJourney: false,
})
assert(mandat.href === "/mandat-sepa", "un contrat non payé reprend au mandat")

const paid = decideDecennaleReprise({
  pendingSignatureHref: null,
  hasContract: true,
  contractDataUsable: true,
  firstPaymentDone: true,
  draftResumeHref: null,
  hasDoJourney: false,
})
assert(paid.href === "/espace-client" && paid.reason === "deja_paye", "un dossier payé ouvre l'espace client")

const draft = decideDecennaleReprise({
  pendingSignatureHref: null,
  hasContract: false,
  contractDataUsable: false,
  firstPaymentDone: false,
  draftResumeHref: "/devis/resume/tok",
  hasDoJourney: true,
})
assert(draft.href === "/devis/resume/tok", "un devis sauvegardé passe avant le parcours dommage ouvrage")

const dommage = decideDecennaleReprise({
  pendingSignatureHref: null,
  hasContract: false,
  contractDataUsable: false,
  firstPaymentDone: false,
  draftResumeHref: null,
  hasDoJourney: true,
})
assert(dommage.href === "/espace-client?suite=do", "un dossier dommage ouvrage revient à l'espace client")

assert(safeRepriseHref("/mandat-sepa", "/mandat-sepa") === "/espace-client", "le mandat ne boucle pas sur lui-même")
assert(safeRepriseHref("/mandat-sepa", "/paiement") === "/mandat-sepa", "le paiement sans session revient au mandat")
assert(safeRepriseHref("/paiement", "/paiement") === "/espace-client", "le paiement ne boucle pas sur lui-même")
assert(safeRepriseHref("/signature", "/signature") === "/devis?from=espace-client", "la signature ne boucle pas sur elle-même")

const sameContract = JSON.stringify({ type: "decennale_premier_trimestre", contractNumero: "C-1" })
const otherContract = JSON.stringify({ type: "decennale_premier_trimestre", contractNumero: "C-2" })
assert(premierTrimestrePaymentMatches(sameContract, "C-1"), "le premier trimestre du même contrat est reconnu")
assert(!premierTrimestrePaymentMatches(otherContract, "C-1"), "un autre contrat ne réutilise pas le lien")
assert(
  !premierTrimestrePaymentMatches(JSON.stringify({ type: "regularisation", contractNumero: "C-1" }), "C-1"),
  "une régularisation n'est pas le premier trimestre"
)

const createPayment = readFileSync(new URL("../app/api/mollie/create-payment/route.ts", import.meta.url), "utf8")
const signaturePage = readFileSync(new URL("../app/signature/page.tsx", import.meta.url), "utf8")
const mandatPage = readFileSync(new URL("../app/mandat-sepa/page.tsx", import.meta.url), "utf8")
const paiementPage = readFileSync(new URL("../app/paiement/page.tsx", import.meta.url), "utf8")
const autonomy = readFileSync(new URL("../app/api/client/autonomy-status/route.ts", import.meta.url), "utf8")
assert(createPayment.includes("premierTrimestrePaymentMatches"), "le premier paiement réutilise le lien du contrat")
assert(createPayment.includes('onPaid: isPremierTrimestre ? "mark-only"'), "le reçu du premier trimestre reste celui du webhook")
assert(signaturePage.includes("decennale-reprise"), "la page signature reprend le dossier du compte")
assert(!signaturePage.includes('router.replace("/devis")'), "la page signature ne renvoie plus au devis brut")
assert(mandatPage.includes('json.reason === "deja_paye"'), "un mandat déjà payé ouvre l'espace client")
assert(paiementPage.includes("alreadyPaid"), "un second clic sur le premier paiement ne recrée pas la caisse")
assert(autonomy.includes("hasCurrentDecennaleFirstPayment"), "le paiement terminé concerne le contrat en cours")
assert(autonomy.includes("decennaleApprovedUnpaid"), "un contrat dommage ouvrage n'ouvre pas le mandat décennale")

console.log("Reprise parcours décennale : OK")
