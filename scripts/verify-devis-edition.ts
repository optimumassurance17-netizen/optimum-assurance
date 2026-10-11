import { readFileSync } from "node:fs"
import {
  alignDoDevisStoredData,
  filterGestionDocumentPatch,
  isContractCoverageLocked,
  isGestionEditableDocumentType,
} from "../lib/devis-edition"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

assert(isGestionEditableDocumentType("devis"), "un devis se modifie depuis la gestion")
assert(isGestionEditableDocumentType("devis_do"), "un devis DO se modifie depuis la gestion")
assert(isGestionEditableDocumentType("contrat"), "un contrat reste modifiable")
assert(!isGestionEditableDocumentType("attestation"), "une attestation ne passe pas par cette modification")

const patch = filterGestionDocumentPatch({
  raisonSociale: " SCA Démo ",
  primeAnnuelle: "1 200,50",
  activites: "Maçonnerie\nÉtanchéité",
  adresseOperation: " 10 rue du Chantier ",
  coutConstruction: "180000",
  secret: "interdit",
})
assert(patch.raisonSociale === "SCA Démo", "la raison sociale est nettoyée")
assert(patch.primeAnnuelle === 1200.5, "la prime accepte l'espace et la virgule")
assert(
  Array.isArray(patch.activites) && patch.activites.join("|") === "Maçonnerie|Étanchéité",
  "les activités restent une liste"
)
assert(patch.secret == null, "un champ inconnu est ignoré")
assert(Object.keys(filterGestionDocumentPatch({ primeAnnuelle: "" })).length === 0, "une prime vide n'efface pas le devis")

const stored = alignDoDevisStoredData(
  "devis_do",
  {
    raisonSociale: "SCA Démo",
    activites: ["Maçonnerie", "Coût construction : 1000"],
    projectAddress: "ancienne adresse",
  },
  patch
)
assert(stored.adresseOperation === "10 rue du Chantier", "l'adresse de construction est enregistrée")
assert(stored.projectAddress === "10 rue du Chantier", "l'adresse du projet suit le chantier")
assert(stored.adresseConstruction === "10 rue du Chantier", "l'adresse imprimée suit le chantier")
assert(stored.coutConstruction === 180000, "le montant des garanties est enregistré")
assert(
  Array.isArray(stored.activites) &&
    stored.activites.includes("Maçonnerie") &&
    stored.activites.some((line) => line === "Coût construction : 180000"),
  "la ligne de coût imprimée suit le nouveau montant"
)
assert(
  alignDoDevisStoredData("devis", { primeAnnuelle: 10 }, { coutConstruction: 12, adresseOperation: "chantier" })
    .primeAnnuelle === 10,
  "un devis décennale n'est pas réécrit comme un devis DO"
)

assert(isContractCoverageLocked("contrat", "valide", false), "un contrat en vigueur reste verrouillé")
assert(isContractCoverageLocked("contrat", "active", false), "un contrat actif reste verrouillé")
assert(!isContractCoverageLocked("contrat", "valide", true), "l'autorisation de la fiche débloque le contrat")
assert(!isContractCoverageLocked("devis", "valide", false), "un devis non signé reste modifiable")
assert(!isContractCoverageLocked("devis_do", "valide", false), "un devis DO non signé reste modifiable")

const gestionRoute = read("../app/api/gestion/documents/[id]/route.ts")
const clientRoute = read("../app/api/documents/[id]/route.ts")
const fiche = read("../app/gestion/clients/[id]/page.tsx")
const clientPage = read("../app/espace-client/documents/[id]/page.tsx")
const button = read("../components/gestion/ModifierDevisButton.tsx")

assert(gestionRoute.includes("isGestionEditableDocumentType"), "la gestion accepte le devis")
assert(gestionRoute.includes("alignDoDevisStoredData"), "le devis DO aligne l'adresse et le montant")
assert(!gestionRoute.includes("payments.create"), "modifier un devis ne crée pas de paiement")
assert(!gestionRoute.includes("allocateNextContractNumber"), "modifier un devis ne prend pas un nouveau numéro")
assert(clientRoute.includes("isContractCoverageLocked"), "l'espace client respecte l'autorisation de la fiche")
assert(clientRoute.includes("allowDevisEdition"), "le document indique si la modification est autorisée")
assert(fiche.includes("Autorisation de modification du devis"), "la fiche porte l'autorisation")
assert(fiche.includes("ModifierDevisButton"), "la fiche ouvre la modification du devis")
assert(fiche.includes('d.type === "devis" || d.type === "devis_do"'), "le bouton vise les devis de la fiche")
assert(clientPage.includes("isContractCoverageLocked"), "l'écran client débloque le contrat autorisé")
assert(button.includes("Modifier le devis"), "le bouton annonce la modification du devis")
assert(button.includes("Enregistrer le devis"), "l'enregistrement met à jour le devis ouvert")
assert(!button.includes("payments.create"), "le bouton ne crée pas de paiement")

console.log("Modification devis fiche : OK")
