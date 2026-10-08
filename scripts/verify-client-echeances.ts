import {
  attachOpenCardLinks,
  buildClientEcheances,
  echeanceReceiptLabel,
  installmentFromPaymentMetadata,
  mollieCardLinkIsClosed,
  molliePaymentIsOpen,
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

console.log("Échéances fiche client : OK")
