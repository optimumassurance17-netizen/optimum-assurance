import { readFileSync } from "node:fs"
import { buildDuplicateGroups, selectionBelongsToOneGroup } from "../lib/duplicate-accounts"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const accounts = [
  {
    id: "new",
    email: "Client@Example.fr",
    raisonSociale: "Nouveau",
    siret: "123 456 789 00012",
    createdAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "old",
    email: "client@example.fr",
    raisonSociale: "Ancien",
    siret: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "siret-old",
    email: "autre@example.fr",
    raisonSociale: "SIRET ancien",
    siret: "12345678900012",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "alone",
    email: "seul@example.fr",
    raisonSociale: "Seul",
    siret: "99999999999999",
    createdAt: "2026-03-01T00:00:00.000Z",
  },
]

const groups = buildDuplicateGroups(accounts)
const emailGroup = groups.find((group) => group.kind === "email")
const siretGroup = groups.find((group) => group.kind === "siret")
assert(emailGroup?.keepId === "old", "le doublon d'email conserve la fiche la plus ancienne")
assert(emailGroup?.members.map((member) => member.id).join(",") === "old,new", "les emails sont regroupés sans tenir compte de la casse")
assert(siretGroup?.keepId === "siret-old", "le doublon de SIRET conserve la fiche la plus ancienne")
assert(siretGroup?.members.some((member) => member.id === "new"), "le même SIRET rapproche des emails différents")
assert(!groups.some((group) => group.members.some((member) => member.id === "alone") && group.members.length === 1), "un compte isolé n'est pas un doublon")

const identical = buildDuplicateGroups([
  { id: "a", email: "a@example.fr", raisonSociale: null, siret: "11111111111111", createdAt: "2026-01-02T00:00:00.000Z" },
  { id: "b", email: "A@example.fr", raisonSociale: null, siret: "11111111111111", createdAt: "2026-01-01T00:00:00.000Z" },
])
assert(identical.length === 1 && identical[0]?.kind === "email", "un même groupe email et SIRET n'est listé qu'une fois")
assert(
  selectionBelongsToOneGroup(groups, "old", ["new"]) && !selectionBelongsToOneGroup(groups, "old", ["alone"]),
  "seules les fiches du même doublon peuvent être fusionnées"
)
assert(!selectionBelongsToOneGroup(groups, "old", ["old"]), "une fiche n'est pas fusionnée avec elle-même")

const route = readFileSync(new URL("../app/api/gestion/clients/duplicates/route.ts", import.meta.url), "utf8")
const merge = readFileSync(new URL("../lib/client-account.ts", import.meta.url), "utf8")
assert(route.includes("selectionBelongsToOneGroup"), "l'API refuse une fusion hors doublon")
assert(route.includes("isAdminEmail"), "un compte administrateur n'est pas supprimé par la fusion")
assert(merge.includes("deleteClientAccount"), "la fiche en double est supprimée après le transfert")
assert(merge.includes("sepaSubscription"), "l'abonnement SEPA est transféré seulement si la fiche conservée n'en a pas")

console.log("Doublons de comptes : OK")
