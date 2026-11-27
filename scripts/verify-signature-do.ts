import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  DO_QUOTE_SIGNATURE_REQUIRED_ERROR,
  doQuotePaymentAllowed,
  isDoQuoteSignatureData,
  signatureFlowFromPendingData,
  signatureFlowLabel,
} from "../lib/do-quote-signature-rules"

assert.equal(doQuotePaymentAllowed("do", null), false)
assert.equal(doQuotePaymentAllowed("do", "  "), false)
assert.equal(doQuotePaymentAllowed("do", "local-document:abc"), true)
assert.equal(doQuotePaymentAllowed("decennale", null), true)
assert.equal(doQuotePaymentAllowed("rc_fabriquant", null), true)

const dossier = { doQuoteFlow: true, insuranceContractId: "ctr_1" }
assert.equal(isDoQuoteSignatureData(dossier), true)
assert.equal(signatureFlowFromPendingData(dossier), "do_quote")
assert.equal(signatureFlowLabel("do_quote"), "Devis dommage ouvrage")
assert.equal(signatureFlowFromPendingData({ customUploadedDevisFlow: true }), "custom_pdf")
assert.equal(signatureFlowFromPendingData({}), "decennale")
assert.equal(isDoQuoteSignatureData({ doQuoteFlow: true }), false)

const pay = readFileSync("app/api/contracts/pay/route.ts", "utf8")
assert(pay.includes("doQuotePaymentAllowed"), "le virement DO vérifie la signature")
assert(pay.includes("DO_QUOTE_SIGNATURE_REQUIRED_ERROR"), "le refus de virement est explicite")

const completion = readFileSync("lib/esign/complete-local-signature.ts", "utf8")
const doBranch = completion.indexOf("isDoQuoteSignatureData")
const decennaleBranch = completion.indexOf("completeLocalDecennaleSignature")
assert(doBranch > 0 && doBranch < decennaleBranch, "le devis DO ne devient pas un contrat décennale")

const flow = readFileSync("lib/souscription-insurance-contract.ts", "utf8")
assert(flow.includes('outcome: "signature_redirect"'), "la souscription DO ouvre la signature")
assert(
  !flow.includes('status === CONTRACT_STATUS.approved && productType === "do"'),
  "un devis DO accepté ne saute plus vers le virement"
)

const sendQuote = readFileSync("app/api/gestion/insurance-contracts/[id]/send-quote/route.ts", "utf8")
assert(sendQuote.includes("openDoQuoteSignature"), "l'envoi du devis DO ouvre la signature")
assert(sendQuote.includes("Signer le devis"), "l'email d'émission contient le lien de signature")

const page = readFileSync("app/page.tsx", "utf8")
assert(!page.includes("€/trimestre prélevé"), "l'accueil ne parle plus d'un prélèvement trimestriel")

const guides = readFileSync("lib/guides-seo.ts", "utf8")
assert(!guides.includes("paiement réel est trimestriel"), "le guide prix suit le prélèvement mensuel")
assert(!guides.includes("paiement du premier trimestre"), "le guide attestation suit le premier mois")

const banner = readFileSync("components/insurance/InsuranceContractParcoursBanner.tsx", "utf8")
assert(!banner.includes("Comme la décennale"), "la RC fabriquant ne compare plus la décennale au trimestre")
assert(banner.includes("DO_DOSSIER_VALIDE_MESSAGE"), "le message de dossier DO validé reste affiché")

const faq = readFileSync("lib/faq-data.ts", "utf8")
assert(faq.includes("Signez ensuite le devis émis"), "la FAQ DO place la signature avant le virement")
assert(
  faq.includes("le mandat SEPA se signe après la signature du contrat et avant le premier paiement"),
  "la FAQ SEPA suit l'ordre du parcours"
)

assert.equal(DO_QUOTE_SIGNATURE_REQUIRED_ERROR, "Signez le devis avant le virement.")

console.log("verify-signature-do: ok")
