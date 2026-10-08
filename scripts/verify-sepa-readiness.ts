import { readFileSync } from "node:fs"
import { describeSepaReadiness, sepaPendingLabel } from "../lib/sepa-readiness"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const absent = describeSepaReadiness(null, new Date("2026-10-08T00:00:00.000Z"))
assert(absent.present === false && absent.cronWouldCharge === false, "sans abonnement, rien n'est prélevé")

const ready = describeSepaReadiness(
  {
    status: "active",
    mollieMandateId: "mdt_1",
    nextSepaDue: "2026-10-01T00:00:00.000Z",
    lastError: null,
    sepaPendingPaymentId: null,
    trimestresSepaPayes: 2,
    primeAnnuelle: 1200,
  },
  new Date("2026-10-08T00:00:00.000Z")
)
assert(ready.cronWouldCharge && ready.mandatePresent && ready.amount === 300, "une échéance due avec mandat serait prélevée")
assert(ready.trimestresSepaPayes === 2, "les trimestres déjà prélevés sont repris")

const pending = describeSepaReadiness(
  {
    status: "active",
    mollieMandateId: "mdt_1",
    nextSepaDue: "2026-10-01T00:00:00.000Z",
    lastError: "incident",
    sepaPendingPaymentId: "tr_open",
    trimestresSepaPayes: 1,
    primeAnnuelle: 800,
  },
  new Date("2026-10-08T00:00:00.000Z")
)
assert(!pending.cronWouldCharge && pending.pendingPaymentId === "tr_open", "un prélèvement déjà lancé bloque le suivant")
assert(pending.pendingLabel === "Prélèvement SEPA", "un débit en attente est nommé prélèvement")
assert(pending.summary.includes("prélèvement SEPA"), "le résumé parle d'un prélèvement, pas d'un identifiant")
assert(pending.lastError === "incident", "le dernier incident reste visible")

const cardLink = describeSepaReadiness(
  {
    status: "active",
    mollieMandateId: "mdt_1",
    nextSepaDue: "2026-10-01T00:00:00.000Z",
    lastError: null,
    sepaPendingPaymentId: "pl_open",
    trimestresSepaPayes: 1,
    primeAnnuelle: 800,
  },
  new Date("2026-10-08T00:00:00.000Z")
)
assert(cardLink.pendingLabel === "Lien carte" && !cardLink.cronWouldCharge, "un lien carte ouvert bloque le cron")
assert(cardLink.summary.includes("lien carte"), "le résumé distingue le lien carte")
assert(
  sepaPendingLabel("tr_card", JSON.stringify({ type: "echeance_carte" })) === "Lien carte",
  "une relance carte stockée sous un paiement est un lien carte"
)

const future = describeSepaReadiness(
  {
    status: "active",
    mollieMandateId: "mdt_1",
    nextSepaDue: "2026-12-01T00:00:00.000Z",
    lastError: null,
    sepaPendingPaymentId: null,
    trimestresSepaPayes: 0,
    primeAnnuelle: 400,
  },
  new Date("2026-10-08T00:00:00.000Z")
)
assert(!future.cronWouldCharge, "une échéance future n'est pas prélevée")

const noMandate = describeSepaReadiness(
  {
    status: "pending_mandate",
    mollieMandateId: null,
    nextSepaDue: "2026-10-01T00:00:00.000Z",
    lastError: null,
    sepaPendingPaymentId: null,
    trimestresSepaPayes: 0,
    primeAnnuelle: 400,
  },
  new Date("2026-10-08T00:00:00.000Z")
)
assert(!noMandate.cronWouldCharge && !noMandate.mandatePresent, "sans mandat, le cron ne prélève pas")

const source = readFileSync(new URL("../lib/sepa-readiness.ts", import.meta.url), "utf8")
assert(!source.includes("createMollieClient") && !source.includes("payments.create"), "la préparation SEPA ne contacte pas Mollie")
const cron = readFileSync(new URL("../app/api/cron/sepa-trimestriel/route.ts", import.meta.url), "utf8")
assert(cron.includes("createSepaTrimestrePayment"), "le cron SEPA reste le seul chemin de prélèvement")

console.log("Préparation SEPA : OK")
