import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  ERRONEOUS_CONTRACT_DELETE_ACTION,
  erroneousContractDeleteConfirm,
  isErroneousContractDocumentType,
} from "../lib/erroneous-contract-delete"

assert.equal(isErroneousContractDocumentType("contrat"), true)
assert.equal(isErroneousContractDocumentType("devis"), false)
assert.equal(isErroneousContractDocumentType("devis_do"), false)
assert.equal(isErroneousContractDocumentType("attestation"), false)
assert.equal(isErroneousContractDocumentType("facture_do"), false)
assert.equal(isErroneousContractDocumentType("avenant"), false)

const unpaid = erroneousContractDeleteConfirm("DEC-1", false)
assert(unpaid.includes("Supprimer définitivement le contrat DEC-1 ?"), "la confirmation nomme le contrat")
assert(unpaid.includes("créé par erreur"), "la confirmation réserve le bouton aux erreurs")
assert(unpaid.includes("encaissements Mollie restent"), "les encaissements Mollie restent")
assert(unpaid.includes("attestations"), "les attestations restent")
assert(!unpaid.includes("échéances liées"), "un contrat non payé ne parle pas des échéances")

const paid = erroneousContractDeleteConfirm("DO-2", true)
assert(paid.includes("échéances liées à ce contrat sont aussi retirées"), "un contrat payé prévient du retrait des échéances")

const insuranceRoute = readFileSync("app/api/gestion/insurance-contracts/[id]/route.ts", "utf8")
const documentRoute = readFileSync("app/api/gestion/documents/[id]/route.ts", "utf8")
const button = readFileSync("components/gestion/DeleteErroneousContractButton.tsx", "utf8")
const labels = readFileSync("lib/admin-activity-label.ts", "utf8")
const dashboard = readFileSync("app/gestion/page.tsx", "utf8")
const platform = readFileSync("components/gestion/InsuranceContractsGestionBlock.tsx", "utf8")
const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
const documentPage = readFileSync("app/gestion/documents/[id]/page.tsx", "utf8")

assert(insuranceRoute.includes("export async function DELETE"), "un administrateur peut supprimer un contrat plateforme")
assert(insuranceRoute.includes("isAdmin"), "la suppression plateforme exige un administrateur")
assert(insuranceRoute.includes("ERRONEOUS_CONTRACT_DELETE_ACTION"), "la suppression plateforme est journalisée")
assert(insuranceRoute.includes("logAdminActivity"), "le journal survit à la suppression du contrat")
assert(!insuranceRoute.includes("prisma.payment.delete"), "les encaissements Mollie ne sont pas effacés")

assert(documentRoute.includes("export async function DELETE"), "un administrateur peut supprimer un contrat signé")
assert(documentRoute.includes("isErroneousContractDocumentType"), "seul un document de type contrat est accepté")
assert(documentRoute.includes("status: 409"), "un devis ou une attestation est refusé")
assert(documentRoute.includes("ERRONEOUS_CONTRACT_DELETE_ACTION"), "la suppression du contrat signé est journalisée")
assert(documentRoute.includes("isGestionEditableDocumentType"), "la modification des devis reste en place")
assert(documentRoute.includes("alignDoDevisStoredData"), "l'alignement du devis DO reste en place")
assert(!documentRoute.includes("payments.create"), "supprimer un contrat ne crée pas de paiement")
assert(!documentRoute.includes("allocateNextContractNumber"), "supprimer un contrat ne prend pas de numéro")

const rules = readFileSync("lib/erroneous-contract-delete.ts", "utf8")
assert(rules.includes(`"${ERRONEOUS_CONTRACT_DELETE_ACTION}"`), "l'action de journal est stable")
assert(labels.includes(`${ERRONEOUS_CONTRACT_DELETE_ACTION}: "Contrat supprimé après erreur"`), "le journal nomme l'action")
assert(button.includes("Supprimer (erreur)"), "le bouton annonce la suppression après erreur")
assert(button.includes("window.confirm"), "la suppression demande une confirmation")
assert(button.includes("method: \"DELETE\""), "le bouton appelle la suppression")

assert(dashboard.includes("DeleteErroneousContractButton"), "le tableau Contrats propose la suppression")
assert(dashboard.includes("/api/gestion/documents/${d.id}"), "le tableau Contrats vise le contrat signé")
assert(platform.includes("DeleteErroneousContractButton"), "les contrats plateforme proposent la suppression")
assert(platform.includes("/api/gestion/insurance-contracts/${c.id}"), "le bloc plateforme vise le contrat")
assert(fiche.includes("DeleteErroneousContractButton"), "la fiche client propose la suppression")
assert(fiche.includes('d.type === "contrat"'), "la fiche ne propose la suppression que pour un contrat")
assert(documentPage.includes("DeleteErroneousContractButton"), "la page du contrat propose la suppression")
assert(documentPage.includes('document.type === "contrat"'), "la page du document limite le bouton au contrat")

console.log("Suppression d'un contrat créé par erreur : vérifications OK")
