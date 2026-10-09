import { readFileSync } from "node:fs"
import { rcFabAttestationWindow } from "../lib/rc-fabriquant-dossier-config"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const firstPaid = new Date("2026-01-15T10:00:00.000Z")
const first = rcFabAttestationWindow({
  paidAt: firstPaid,
  validFrom: null,
  validUntil: null,
  monthsStep: 3,
})
assert(first.validFrom.getTime() === firstPaid.getTime(), "la première échéance ouvre l'attestation")
assert(first.validUntil.getMonth() === 3, "la première échéance trimestrielle couvre trois mois")

const nextPaid = new Date("2026-04-01T10:00:00.000Z")
const extended = rcFabAttestationWindow({
  paidAt: nextPaid,
  validFrom: first.validFrom,
  validUntil: first.validUntil,
  monthsStep: 3,
})
assert(extended.validFrom.getTime() === first.validFrom.getTime(), "la date de début reste celle du contrat")
assert(extended.validUntil.getMonth() === 6, "l'échéance suivante allonge la fin de validité")

const latePaid = new Date("2026-08-20T10:00:00.000Z")
const restarted = rcFabAttestationWindow({
  paidAt: latePaid,
  validFrom: first.validFrom,
  validUntil: first.validUntil,
  monthsStep: 3,
})
assert(restarted.validUntil.getMonth() === 10, "un paiement après l'échéance repart de la date d'encaissement")

const service = readFileSync("lib/insurance-contract-service.ts", "utf8")
const installmentPaid = service.indexOf('action: "installment_paid"')
const reprint = service.indexOf("await generatePostPaymentPdfs(contractId, fresh)", installmentPaid)
assert(installmentPaid > 0 && reprint > installmentPaid, "l'échéance réimprime l'attestation")
assert(
  service.indexOf('context: "rc_fabriquant_installment"', reprint) > reprint,
  "l'échec d'impression est rattaché à l'échéance"
)
assert(service.includes('c.productType === "rc_fabriquant"'), "le premier paiement RC ouvre une période d'échéance")

console.log("verify-rc-attestation-window: ok")
