import { readFileSync } from "node:fs"
import {
  attachOpenCardLinks,
  attestationIdFromPaymentMetadata,
  buildClientEcheances,
  cardPaymentMatches,
  echeanceReceiptLabel,
  installmentFromPaymentMetadata,
  mollieCardLinkIsClosed,
  molliePaymentIsOpen,
  nextUnpaidEcheance,
  pendingCardEcheanceId,
  paidAttestationMoments,
  paymentEcheanceLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  readEcheanceCardLink,
} from "../lib/client-echeances"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const open = buildClientEcheances({
  primeAnnuelle: 1200,
  anchorDate: new Date("2026-01-15T00:00:00.000Z"),
  firstTrimesterPaidAt: null,
  trimestresSepaPayes: 0,
  sepaSubscriptionId: "sepa-1",
  explicitPaidInstallments: [],
  avenantFees: [],
  suspendedAttestations: [],
})
assert(open.length === 4, "une prime annuelle ouvre 4 échéances")
assert(open.every((row) => row.amount === 300 && !row.paid), "chaque échéance ouverte vaut le trimestre")
assert(open[1]?.dueDate?.startsWith("2026-04-15"), "la deuxième échéance est trois mois plus tard")

const partial = buildClientEcheances({
  primeAnnuelle: 800,
  anchorDate: new Date("2026-01-01T00:00:00.000Z"),
  firstTrimesterPaidAt: new Date("2026-01-01T00:00:00.000Z"),
  trimestresSepaPayes: 1,
  sepaSubscriptionId: "sepa-1",
  explicitPaidInstallments: [{ installment: 4, paidAt: new Date("2026-10-01T00:00:00.000Z") }],
  avenantFees: [
    { id: "fee1", amount: 60, status: "pending", paidAt: null, createdAt: new Date("2026-03-01T00:00:00.000Z") },
    { id: "fee2", amount: 60, status: "paid", paidAt: new Date("2026-03-02T00:00:00.000Z"), createdAt: new Date("2026-03-01T00:00:00.000Z") },
  ],
  suspendedAttestations: [{ id: "doc1", numero: "AT-1", amount: 200, createdAt: new Date("2026-05-01T00:00:00.000Z") }],
})
const byId = new Map(partial.map((row) => [row.id, row]))
assert(byId.get("decennale:1")?.paid === true, "le premier trimestre payé est réglé")
assert(byId.get("decennale:2")?.paid === true, "le prélèvement SEPA suivant est réglé")
assert(byId.get("decennale:3")?.paid === false, "l'échéance suivante reste à régler")
assert(byId.get("decennale:4")?.paid === true, "une échéance marquée explicitement est réglée")
assert(byId.get("avenant:fee1")?.paid === false, "les frais d'avenant en attente restent ouverts")
assert(byId.get("avenant:fee2")?.paid === true, "les frais d'avenant payés sont réglés")
assert(byId.get("attestation:doc1")?.amount === 200 && byId.get("attestation:doc1")?.paid === false, "la régularisation suspendue est ouverte")
assert(byId.get("decennale:3")?.sepaFailure == null, "sans incident, l'échéance ouverte n'est pas marquée refusée")

const settled = buildClientEcheances({
  primeAnnuelle: null,
  anchorDate: null,
  firstTrimesterPaidAt: null,
  trimestresSepaPayes: 0,
  sepaSubscriptionId: null,
  explicitPaidInstallments: [],
  avenantFees: [],
  suspendedAttestations: [{
    id: "doc2",
    numero: "AT-2",
    amount: 150,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    paid: true,
    paidAt: new Date("2026-06-02T00:00:00.000Z"),
  }],
})
assert(settled[0]?.id === "attestation:doc2" && settled[0]?.paid === true, "une régularisation payée reste affichée comme réglée")

const refused = buildClientEcheances({
  primeAnnuelle: 400,
  anchorDate: new Date("2026-01-01T00:00:00.000Z"),
  firstTrimesterPaidAt: new Date("2026-01-01T00:00:00.000Z"),
  trimestresSepaPayes: 1,
  sepaSubscriptionId: "sepa-1",
  sepaLastError: "Solde insuffisant",
  explicitPaidInstallments: [],
  avenantFees: [],
  suspendedAttestations: [],
})
assert(refused.find((row) => row.id === "decennale:2")?.sepaFailure == null, "une échéance déjà réglée ne porte pas le refus")
assert(refused.find((row) => row.id === "decennale:3")?.sepaFailure === "Solde insuffisant", "le refus SEPA est sur la prochaine échéance")
assert(refused.find((row) => row.id === "decennale:4")?.sepaFailure == null, "les échéances suivantes ne répètent pas le refus")

assert(installmentFromPaymentMetadata(JSON.stringify({ type: "decennale_premier_trimestre" })) === 1, "le premier paiement carte compte pour l'échéance 1")
assert(installmentFromPaymentMetadata(JSON.stringify({ echeanceId: "decennale:3" })) === 3, "l'identifiant d'échéance donne son numéro")
assert(installmentFromPaymentMetadata("pas-json") === null, "un metadata illisible est ignoré")
assert(open.every((row) => row.cardLinkStatus === "none" && row.checkoutUrl === null), "aucune échéance neuve n'a de lien carte")

const withLink = attachOpenCardLinks(open, [
  {
    status: "pending",
    molliePaymentId: "tr_old",
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    metadata: JSON.stringify({ type: "echeance_carte", echeanceId: "decennale:2", checkoutUrl: "https://pay.example/old" }),
  },
  {
    status: "pending",
    molliePaymentId: "tr_new",
    createdAt: new Date("2026-02-02T00:00:00.000Z"),
    metadata: JSON.stringify({ type: "echeance_carte", echeanceId: "decennale:2", checkoutUrl: "https://pay.example/new" }),
  },
  {
    status: "paid",
    molliePaymentId: "tr_paid",
    createdAt: new Date("2026-02-03T00:00:00.000Z"),
    metadata: JSON.stringify({ type: "echeance_carte", echeanceId: "decennale:1", checkoutUrl: "https://pay.example/paid" }),
  },
])
assert(withLink.find((row) => row.id === "decennale:2")?.cardLinkStatus === "open", "le lien carte en attente est visible")
assert(
  withLink.find((row) => row.id === "decennale:2")?.cardLinkSentAt === "2026-02-02T00:00:00.000Z",
  "la date d'envoi du lien est celle du paiement en attente"
)
assert(
  withLink.find((row) => row.id === "decennale:2")?.checkoutUrl === "https://pay.example/new",
  "le lien le plus récent est conservé"
)
assert(withLink.find((row) => row.id === "decennale:1")?.cardLinkStatus === "none", "un paiement déjà payé n'affiche pas de lien ouvert")
assert(readEcheanceCardLink(JSON.stringify({ type: "echeance_manuelle", echeanceId: "decennale:1" })) === null, "un règlement manuel n'est pas un lien carte")
assert(molliePaymentIsOpen("open") && molliePaymentIsOpen("pending") && molliePaymentIsOpen("authorized"), "un paiement Mollie ouvert bloque un second lien")
assert(mollieCardLinkIsClosed("expired") && mollieCardLinkIsClosed("canceled") && mollieCardLinkIsClosed("failed"), "un lien expiré peut être remplacé")
assert(echeanceReceiptLabel({ label: "Échéance 2" }) === "Échéance 2", "le reçu reprend le libellé enregistré")
assert(echeanceReceiptLabel({ type: "sepa_trimestre", sepaInstallmentNumber: "3" }) === "Prélèvement SEPA n°3", "le reçu SEPA indique le numéro")
assert(echeanceReceiptLabel({ type: "echeance_carte", echeanceId: "avenant:fee1" }) === "Frais d'avenant", "le reçu d'avenant a un libellé")
assert(paymentStatusLabel("paid") === "Payé" && paymentStatusLabel("pending") === "Lien envoyé" && paymentStatusLabel("failed") === "Échoué", "les statuts de paiement sont en français")
assert(
  paymentEcheanceLabel(JSON.stringify({ type: "echeance_carte", label: "Échéance 2" })) === "Échéance 2",
  "le tableau des paiements reprend le nom de l'échéance"
)
assert(
  paymentEcheanceLabel(JSON.stringify({ type: "regularisation", attestationNumero: "AT-9" })) === "Régularisation AT-9",
  "une régularisation porte son numéro"
)
const moments = paidAttestationMoments([
  {
    status: "paid",
    metadata: JSON.stringify({ attestationId: "doc2" }),
    paidAt: new Date("2026-06-02T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  },
])
assert(attestationIdFromPaymentMetadata(JSON.stringify({ attestationId: "doc2" })) === "doc2", "le paiement identifie l'attestation")
assert(moments.get("doc2")?.toISOString() === "2026-06-02T00:00:00.000Z", "la date de règlement de l'attestation est conservée")
assert(paymentMethodLabel(null, "manuel_1") === "Règlement manuel", "un paiement manuel est identifié")
assert(paymentMethodLabel(JSON.stringify({ type: "virement_externe" }), "virement_1") === "Virement", "un virement externe est identifié")
assert(
  paymentEcheanceLabel(JSON.stringify({ type: "virement_externe", label: "Échéance 2" })) === "Échéance 2",
  "le virement externe garde le nom de l'échéance"
)
assert(
  !cardPaymentMatches(JSON.stringify({ type: "virement_externe", echeanceId: "decennale:2" }), { echeanceId: "decennale:2" }),
  "un virement externe n'est pas un lien carte"
)
assert(paymentMethodLabel(JSON.stringify({ type: "sepa_trimestre" })) === "Prélèvement SEPA", "un prélèvement SEPA est identifié")
assert(paymentMethodLabel(JSON.stringify({ type: "echeance_carte" })) === "Carte", "un paiement carte est identifié")
assert(nextUnpaidEcheance(partial)?.id === "decennale:3", "la prochaine échéance est la première non réglée")
assert(
  cardPaymentMatches(JSON.stringify({ type: "regularisation", attestationId: "doc1" }), { echeanceId: "attestation:doc1" }),
  "une régularisation correspond à l'échéance d'attestation"
)
assert(
  !cardPaymentMatches(JSON.stringify({ type: "echeance_manuelle", echeanceId: "decennale:1" }), { echeanceId: "decennale:1" }),
  "un règlement manuel n'est pas un lien carte réutilisable"
)

const attestationRows = buildClientEcheances({
  primeAnnuelle: null,
  anchorDate: null,
  firstTrimesterPaidAt: null,
  trimestresSepaPayes: 0,
  sepaSubscriptionId: null,
  explicitPaidInstallments: [],
  avenantFees: [],
  suspendedAttestations: [{ id: "doc1", numero: "AT-1", amount: 80, createdAt: new Date("2026-05-01T00:00:00.000Z") }],
})
const reusedAttestation = attachOpenCardLinks(attestationRows, [
  {
    status: "pending",
    molliePaymentId: "tr_reg",
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    metadata: JSON.stringify({
      type: "regularisation",
      attestationId: "doc1",
      checkoutUrl: "https://pay.example/reg",
    }),
  },
])
assert(reusedAttestation[0]?.cardLinkStatus === "open", "le lien de régularisation client s'affiche sur l'échéance")
assert(reusedAttestation[0]?.checkoutUrl === "https://pay.example/reg", "l'adresse du lien de régularisation est conservée")

const createPayment = readFileSync(new URL("../app/api/mollie/create-payment/route.ts", import.meta.url), "utf8")
const clientEcheance = readFileSync(new URL("../app/api/client/prochaine-echeance/route.ts", import.meta.url), "utf8")
const adminEcheance = readFileSync(new URL("../app/api/gestion/clients/[id]/echeances/route.ts", import.meta.url), "utf8")
assert(createPayment.includes("reused: true") && createPayment.includes('status: "pending"'), "la régularisation réutilise et enregistre le lien ouvert")
assert(!clientEcheance.includes("payments.create"), "l'espace client ne crée pas de nouveau paiement pour l'échéance")
assert(clientEcheance.includes("resolveOpenCardLink"), "l'espace client renvoie le lien déjà ouvert")
const prevenirAt = adminEcheance.indexOf('action === "prevenir"')
const refreshAt = adminEcheance.indexOf("await refreshPendingCardPayment")
assert(prevenirAt > 0 && refreshAt > prevenirAt, "l'information de refus SEPA part avant toute lecture Mollie")
assert(adminEcheance.includes("sendSepaFailureNotice"), "le refus SEPA prévient le client par email")
const reglerAt = adminEcheance.indexOf('if (action === "regler" || action === "virement")')
const receiptAt = adminEcheance.indexOf("sendEcheancePaidReceipt", reglerAt)
assert(reglerAt > 0 && receiptAt > reglerAt, "le règlement manuel et le virement envoient le reçu")
assert(adminEcheance.includes("virement_externe"), "le virement externe est enregistré comme tel")
assert(adminEcheance.includes("Un prélèvement SEPA est déjà parti à la banque"), "un prélèvement déjà parti bloque le virement")
assert(!adminEcheance.includes("payments.create"), "la fiche ne crée pas un paiement Mollie pour le virement")

const adoptedLink = JSON.stringify({
  type: "echeance_carte",
  cardLinkEcheanceId: "decennale:2",
  checkoutUrl: "https://pay.example/adopted",
})
assert(pendingCardEcheanceId({ status: "pending", molliePaymentId: "tr_old", metadata: adoptedLink }) === "decennale:2", "un lien carte repris s'affiche")
assert(installmentFromPaymentMetadata(adoptedLink) === null, "un lien repris ne compte pas comme une échéance payée")
assert(cardPaymentMatches(adoptedLink, { echeanceId: "decennale:2" }), "un lien repris correspond à l'échéance")
assert(
  pendingCardEcheanceId({ status: "paid", molliePaymentId: "tr_old", metadata: adoptedLink }) === null,
  "un paiement déjà réglé n'est plus un lien ouvert"
)

const attestationRelance = readFileSync(new URL("../app/api/gestion/documents/[id]/relance-carte/route.ts", import.meta.url), "utf8")
const sepaRelance = readFileSync(new URL("../app/api/gestion/sepa/[id]/relance-carte/route.ts", import.meta.url), "utf8")
assert(attestationRelance.includes("resolveOpenCardLink") && attestationRelance.includes("createStoredCardPayment"), "la relance attestation réutilise le lien ouvert")
assert(
  attestationRelance.indexOf("await resolveOpenCardLink") < attestationRelance.indexOf("createStoredCardPayment({"),
  "la relance attestation vérifie le lien avant d'en créer un"
)
assert(!attestationRelance.includes("payments.create"), "la relance attestation ne crée pas le paiement elle-même")
assert(sepaRelance.includes("resolveOpenCardLink") && sepaRelance.includes("readRemotePaymentLock"), "la relance SEPA vérifie le paiement déjà lancé")
assert(
  sepaRelance.indexOf("await readRemotePaymentLock") < sepaRelance.indexOf("createStoredCardPayment({"),
  "la relance SEPA bloque un prélèvement ouvert avant un nouveau lien"
)
assert(sepaRelance.includes("Un prélèvement SEPA est déjà en cours"), "un prélèvement ouvert empêche un second lien")
assert(!sepaRelance.includes("payments.create"), "la relance SEPA ne crée pas le paiement elle-même")

console.log("Échéances fiche client : OK")
