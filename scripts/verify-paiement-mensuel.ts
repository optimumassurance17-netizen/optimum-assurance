import { readFileSync } from "node:fs"
import { buildClientEcheances } from "../lib/client-echeances"
import { chiffrerAjoutActivite } from "../lib/decennale-ajout-activite"
import {
  moisEntreEcheancesDecennale,
  primeEcheanceDecennale,
  primeMensuelle,
} from "../lib/premium"
import { describeSepaReadiness } from "../lib/sepa-readiness"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

assert(primeMensuelle(1200) === 100, "1 200 € / an font 100 € par mois")
assert(primeEcheanceDecennale(1200, "mensuel") === 100, "une échéance mensuelle vaut un douzième")
assert(primeEcheanceDecennale(1200, "trimestriel") === 300, "une échéance déjà trimestrielle reste un quart")
assert(moisEntreEcheancesDecennale("mensuel") === 1, "le rythme mensuel avance d'un mois")
assert(moisEntreEcheancesDecennale("trimestriel") === 3, "le rythme trimestriel avance de trois mois")

const empty = {
  explicitPaidInstallments: [],
  avenantFees: [],
  suspendedAttestations: [],
}

const trimestriel = buildClientEcheances({
  primeAnnuelle: 1200,
  anchorDate: new Date("2026-01-15T00:00:00.000Z"),
  firstTrimesterPaidAt: null,
  trimestresSepaPayes: 0,
  sepaSubscriptionId: "sepa-1",
  ...empty,
})
assert(trimestriel.length === 4 && trimestriel.every((row) => row.amount === 300), "sans périodicité, l'échéancier reste trimestriel")
assert(trimestriel[1]?.dueDate?.startsWith("2026-04-15"), "la deuxième échéance trimestrielle est trois mois plus tard")

const mensuel = buildClientEcheances({
  primeAnnuelle: 1200,
  anchorDate: new Date("2026-01-15T00:00:00.000Z"),
  firstTrimesterPaidAt: null,
  trimestresSepaPayes: 0,
  sepaSubscriptionId: "sepa-1",
  periodicite: "mensuel",
  ...empty,
})
assert(mensuel.length === 12 && mensuel.every((row) => row.amount === 100), "un contrat mensuel ouvre 12 échéances de 100 €")
assert(mensuel[1]?.dueDate?.startsWith("2026-02-15"), "la deuxième échéance mensuelle est un mois plus tard")

const ajout = {
  chiffreAffaires: 100_000,
  primeAnnuelle: 1386,
  sinistres: 0,
  jamaisAssure: false,
  resilieNonPaiement: false,
  reprisePasse: false,
  trimestresDejaPayes: 2,
  activites: ["Électricité générale"],
  activite: "Étanchéité toiture",
}
const ajoutTrimestre = chiffrerAjoutActivite(ajout)
const ajoutMois = chiffrerAjoutActivite({ ...ajout, periodicite: "mensuel" })
assert(ajoutTrimestre.ok && ajoutMois.ok, "l'ajout d'activité reste chiffrable")
if (ajoutTrimestre.ok && ajoutMois.ok) {
  assert(ajoutMois.regularisation > 0 && ajoutMois.regularisation < ajoutTrimestre.regularisation, "la régularisation mensuelle suit le mois déjà payé")
}

const service = readFileSync(new URL("../lib/insurance-contract-service.ts", import.meta.url), "utf8")
assert(service.includes("return primeMensuelle(premiumAnnualOrInstallment)"), "un nouveau virement décennale demande un mois")
assert(
  service.includes("primeTrimestrielle(contractPremium)"),
  "un virement trimestriel déjà lancé reste accepté"
)

const sepaBase = {
  status: "active",
  mollieMandateId: "mdt_1",
  nextSepaDue: "2026-01-01T00:00:00.000Z",
  lastError: null,
  sepaPendingPaymentId: null,
  trimestresSepaPayes: 0,
  primeAnnuelle: 1200,
}
assert(
  describeSepaReadiness(sepaBase, new Date("2026-10-08T00:00:00.000Z")).amount === 300,
  "un mandat sans périodicité mensuelle reste prélevé au trimestre"
)
assert(
  describeSepaReadiness({ ...sepaBase, periodicite: "mensuel" }, new Date("2026-10-08T00:00:00.000Z")).amount === 100,
  "un mandat mensuel est prélevé au mois"
)

const paiement = readFileSync(new URL("../app/paiement/page.tsx", import.meta.url), "utf8")
const mandat = readFileSync(new URL("../app/mandat-sepa/page.tsx", import.meta.url), "utf8")
const cron = readFileSync(new URL("../app/api/cron/sepa-trimestriel/route.ts", import.meta.url), "utf8")
const setup = readFileSync(new URL("../lib/mollie-sepa.ts", import.meta.url), "utf8")
assert(paiement.includes('periodicite: "mensuel"'), "le paiement carte enregistre le rythme mensuel")
assert(paiement.includes("decennale_premier_trimestre"), "le type de paiement carte reste reconnu par le webhook")
assert(paiement.includes("primeMensuelle"), "le premier règlement carte est un mois")
assert(!paiement.includes("/ 4"), "le parcours carte ne calcule plus un trimestre")
assert(mandat.includes('const PERIODICITE: PeriodicitePrelevement = "mensuel"'), "le mandat SEPA est mensuel")
assert(cron.includes("primeEcheanceDecennale"), "le cron choisit le montant selon la périodicité")
assert(cron.includes("periodiciteDecennale"), "le cron lit la périodicité enregistrée")
assert(setup.includes("periodicite,"), "le nouveau mandat enregistre sa périodicité")

console.log("Paiement mensuel décennale : OK")
