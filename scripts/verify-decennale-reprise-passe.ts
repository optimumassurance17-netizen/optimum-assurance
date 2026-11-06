import { readFileSync } from "node:fs"
import {
  addCalendarMonths,
  isoToFrenchDate,
  reprisePasseWindow,
  validateReprisePasseDate,
} from "../lib/decennale-reprise-passe"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = new Date("2026-11-06T10:00:00.000Z")
const windowDates = reprisePasseWindow(now)
assert(windowDates.latest === "2026-11-06", "le jour de Paris est la date la plus récente")
assert(windowDates.earliest === "2026-08-06", "la reprise remonte de 3 mois, pas davantage")
assert(addCalendarMonths("2026-03-31", -1) === "2026-02-28", "un mois plus court reste sur le dernier jour")

const oldest = validateReprisePasseDate(windowDates.earliest, now)
const tooOld = validateReprisePasseDate("2026-08-05", now)
const future = validateReprisePasseDate("2026-11-07", now)
assert(oldest.ok && oldest.dateReprise === "2026-08-06", "la date limite de 3 mois est acceptée")
assert(!tooOld.ok, "une date de plus de 3 mois est refusée")
assert(!future.ok, "une date future est refusée")
assert(isoToFrenchDate("2026-08-06") === "06/08/2026", "la date de reprise s'écrit en français")

const page = readFileSync(new URL("../app/gestion/clients/[id]/page.tsx", import.meta.url), "utf8")
const route = readFileSync(new URL("../lib/decennale-reprise-passe-service.ts", import.meta.url), "utf8")
const attestation = readFileSync(new URL("../components/documents/AttestationTemplate.tsx", import.meta.url), "utf8")
const honneur = readFileSync(new URL("../components/documents/AttestationNonSinistraliteTemplate.tsx", import.meta.url), "utf8")
assert(page.includes("Autoriser la reprise du passé"), "la fiche client propose l'autorisation")
const clientPage = readFileSync(new URL("../app/espace-client/documents/[id]/page.tsx", import.meta.url), "utf8")
const email = readFileSync(new URL("../lib/email.ts", import.meta.url), "utf8")
assert(clientPage.includes("ReprisePasseExplication"), "l'espace client explique la modification")
assert(email.includes("reprisePasseClientText"), "l'e-mail client explique la modification")
assert(page.includes("/reprise-passe"), "la fiche appelle l'autorisation")
assert(route.includes('type: "attestation_non_sinistralite"'), "la déclaration sur l'honneur est créée")
assert(route.includes("dateEffet: dateRepriseLabel"), "l'attestation décennale reçoit la date de reprise")
assert(route.includes("avant la date de reprise choisie"), "une reprise ne peut pas raccourcir un contrat déjà plus ancien")
assert(route.includes("sinistre.count"), "un sinistre déclaré bloque la reprise")
assert(attestation.includes("Date de reprise du passé"), "l'attestation affiche la date de reprise")
assert(honneur.includes("ATTESTATION SUR L'HONNEUR DE NON-SINISTRALITÉ"), "la déclaration est sur l'honneur")

console.log("Reprise du passé décennale : OK")
