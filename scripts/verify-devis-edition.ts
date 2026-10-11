import { readFileSync } from "node:fs"
import {
  alignDoDevisStoredData,
  collectDocumentDevisEditionDecisions,
  filterGestionDocumentPatch,
  isClientQuoteEditionLocked,
  isContractCoverageLocked,
  isGestionEditableDocumentType,
  isPerDocumentDevisEditionType,
  parseDocumentDevisEditionDecision,
  resolveDocumentDevisEdition,
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
assert(!isContractCoverageLocked("contrat", "valide", true), "l'autorisation de ce devis débloque le contrat")
assert(!isContractCoverageLocked("devis", "valide", false), "le verrou de couverture ne concerne pas le devis")
assert(!isContractCoverageLocked("devis_do", "valide", false), "le verrou de couverture ne concerne pas le devis DO")
assert(isClientQuoteEditionLocked("devis", false), "un devis non autorisé reste fermé")
assert(isClientQuoteEditionLocked("devis_do", false), "un devis DO non autorisé reste fermé")
assert(!isClientQuoteEditionLocked("devis", true), "un devis autorisé s'ouvre")
assert(!isClientQuoteEditionLocked("devis_do", true), "un devis DO autorisé s'ouvre")
assert(!isClientQuoteEditionLocked("contrat", false), "le verrou du devis ne remplace pas celui du contrat")

assert(isPerDocumentDevisEditionType("devis"), "un devis a sa propre autorisation")
assert(isPerDocumentDevisEditionType("devis_do"), "un devis DO a sa propre autorisation")
assert(isPerDocumentDevisEditionType("contrat"), "un contrat a sa propre autorisation")
assert(!isPerDocumentDevisEditionType("attestation"), "une attestation n'a pas cette autorisation")
assert(parseDocumentDevisEditionDecision('{"allowDevisEdition":true}') === true, "une autorisation explicite est lue")
assert(parseDocumentDevisEditionDecision('{"allowDevisEdition":false}') === false, "un retrait explicite est lu")
assert(parseDocumentDevisEditionDecision("pas du json") === null, "un journal illisible n'invente pas d'autorisation")
assert(
  resolveDocumentDevisEdition({ documentDecision: true, clientWide: false }) === true,
  "l'autorisation de ce devis prime sur le refus général"
)
assert(
  resolveDocumentDevisEdition({ documentDecision: false, clientWide: true }) === false,
  "le retrait de ce devis prime sur l'autorisation générale"
)
assert(
  resolveDocumentDevisEdition({ documentDecision: null, clientWide: true }) === true,
  "sans réglage propre, l'ancienne autorisation de fiche reste"
)
const decisions = collectDocumentDevisEditionDecisions([
  {
    targetId: "doc_1",
    details: '{"allowDevisEdition":false}',
    createdAt: "2026-10-11T12:00:00.000Z",
  },
  {
    targetId: "doc_1",
    details: '{"allowDevisEdition":true}',
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    targetId: "doc_2",
    details: '{"allowDevisEdition":true}',
    createdAt: "2026-10-11T09:00:00.000Z",
  },
])
assert(decisions.get("doc_1") === false, "le dernier journal de ce devis l'emporte")
assert(decisions.get("doc_2") === true, "un autre devis garde sa propre autorisation")

const gestionRoute = read("../app/api/gestion/documents/[id]/route.ts")
const editionRoute = read("../app/api/gestion/documents/[id]/edition/route.ts")
const clientRoute = read("../app/api/documents/[id]/route.ts")
const ficheRoute = read("../app/api/gestion/clients/[id]/route.ts")
const fiche = read("../app/gestion/clients/[id]/page.tsx")
const clientPage = read("../app/espace-client/documents/[id]/page.tsx")
const button = read("../components/gestion/ModifierDevisButton.tsx")
const authorizeButton = read("../components/gestion/AutoriserDevisButton.tsx")

assert(gestionRoute.includes("isGestionEditableDocumentType"), "la gestion accepte le devis")
assert(gestionRoute.includes("alignDoDevisStoredData"), "le devis DO aligne l'adresse et le montant")
assert(!gestionRoute.includes("payments.create"), "modifier un devis ne crée pas de paiement")
assert(!gestionRoute.includes("allocateNextContractNumber"), "modifier un devis ne prend pas un nouveau numéro")
assert(clientRoute.includes("getDocumentDevisEdition"), "l'espace client lit l'autorisation de ce devis")
assert(clientRoute.includes("isClientQuoteEditionLocked"), "l'espace client refuse un devis non autorisé")
assert(clientRoute.includes("isContractCoverageLocked"), "l'espace client respecte l'autorisation de ce devis")
assert(clientRoute.includes("allowDevisEdition"), "le document indique si la modification est autorisée")
assert(ficheRoute.includes("collectDocumentDevisEditionDecisions"), "la fiche distingue l'autorisation de chaque devis")
assert(editionRoute.includes("DOCUMENT_DEVIS_EDITION_ACTION"), "l'autorisation est enregistrée sur le devis")
assert(editionRoute.includes("isPerDocumentDevisEditionType"), "seuls les devis et contrats reçoivent cette autorisation")
assert(fiche.includes("Chaque devis a sa propre autorisation."), "la fiche annonce l'autorisation par devis")
assert(fiche.includes("Retirer l'autorisation générale"), "la fiche retire l'autorisation générale")
assert(fiche.includes("Elle ouvre aussi les nouveaux devis."), "la fiche explique l'effet sur les nouveaux devis")
assert(fiche.includes("AutoriserDevisButton"), "la fiche autorise chaque devis")
assert(!fiche.includes("Autoriser la modification du devis"), "la fiche n'autorise plus tous les devis d'un coup")
assert(fiche.includes("ModifierDevisButton"), "la fiche ouvre la modification du devis")
assert(fiche.includes('d.type === "devis" || d.type === "devis_do"'), "le bouton vise les devis de la fiche")
assert(clientPage.includes("isClientQuoteEditionLocked"), "l'écran client ferme le devis non autorisé")
assert(clientPage.includes("isContractCoverageLocked"), "l'écran client débloque le contrat autorisé")
assert(fiche.includes("Sans cette autorisation, le client ne peut pas modifier le devis."), "la fiche explique le verrou du devis")
assert(button.includes("Modifier le devis"), "le bouton annonce la modification du devis")
assert(button.includes("Enregistrer le devis"), "l'enregistrement met à jour le devis ouvert")
assert(!button.includes("payments.create"), "le bouton ne crée pas de paiement")
assert(authorizeButton.includes("Autoriser ce devis"), "le bouton autorise ce devis")
assert(authorizeButton.includes("/edition"), "le bouton enregistre l'autorisation de ce devis")

console.log("Modification devis fiche : OK")
