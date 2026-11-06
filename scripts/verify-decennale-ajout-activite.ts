import { readFileSync } from "node:fs"
import {
  activitesDejaCouvertes,
  chiffrerAjoutActivite,
} from "../lib/decennale-ajout-activite"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const base = {
  chiffreAffaires: 100_000,
  primeAnnuelle: 1386,
  sinistres: 0,
  jamaisAssure: false,
  resilieNonPaiement: false,
  reprisePasse: false,
  trimestresDejaPayes: 2,
}

const hausse = chiffrerAjoutActivite({
  ...base,
  activites: ["Électricité générale"],
  activite: "Étanchéité toiture",
})
assert(hausse.ok, "une activité plus risquée est acceptée")
if (hausse.ok) {
  assert(hausse.nouvellePrimeAnnuelle > hausse.primeAnnuelle, "la cotisation augmente")
  assert(hausse.regularisation > 0, "les échéances déjà payées sont régularisées")
  assert(hausse.cotisationInchangee === false, "la hausse est signalée")
}

const sansEcheance = chiffrerAjoutActivite({
  ...base,
  trimestresDejaPayes: 0,
  activites: ["Électricité générale"],
  activite: "Étanchéité toiture",
})
assert(sansEcheance.ok && sansEcheance.regularisation === 0, "aucune échéance payée, aucune régularisation immédiate")
assert(sansEcheance.ok && sansEcheance.nouvellePrimeAnnuelle > base.primeAnnuelle, "la cotisation future augmente quand même")

const stable = chiffrerAjoutActivite({
  ...base,
  activites: ["Électricité générale"],
  activite: "Domotique",
})
assert(stable.ok && stable.cotisationInchangee && stable.regularisation === 0, "une activité moins risquée ne change pas la cotisation")

const doublon = chiffrerAjoutActivite({
  ...base,
  activites: ["Gros œuvre — Électricité générale"],
  activite: "Électricité générale",
})
assert(!doublon.ok, "une activité déjà couverte est refusée")

const inconnue = chiffrerAjoutActivite({
  ...base,
  activites: ["Électricité générale"],
  activite: "Activité inconnue",
})
assert(!inconnue.ok, "une activité hors liste est refusée")

const huit = chiffrerAjoutActivite({
  ...base,
  activites: [
    "Maçonnerie générale",
    "Béton armé",
    "Coffrage",
    "Ferraillage",
    "Charpente bois",
    "Couverture tuiles",
    "Bardage",
    "Électricité générale",
  ],
  activite: "Plomberie sanitaire",
})
assert(!huit.ok, "la neuvième activité est refusée")
assert(activitesDejaCouvertes(["Lot : Étanchéité toiture"]).includes("Étanchéité toiture"), "une ligne de contrat reconnaît l'activité")

const page = readFileSync(new URL("../app/espace-client/page.tsx", import.meta.url), "utf8")
const route = readFileSync(new URL("../app/api/client/ajout-activite/route.ts", import.meta.url), "utf8")
assert(page.includes("AjoutActiviteClient"), "l'espace client propose l'ajout")
assert(route.includes("ajouterActiviteClient"), "l'ajout passe par le service client")

console.log("Ajout d'activité avec régularisation : OK")
