import { readFileSync } from "node:fs"
import { adminActivityLabel, describeClientActivity } from "../lib/admin-activity-label"
import {
  describeClientSignature,
  latestSignatureReminderByRequest,
  signatureReminderPayload,
} from "../lib/signature-reminder"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const signedAt = new Date("2026-03-01T10:00:00.000Z")
const signed = describeClientSignature({
  documents: [
    { type: "contrat", numero: "DEC-1", status: "valide", createdAt: signedAt },
    { type: "contrat", numero: "DEC-OLD", status: "resilie", createdAt: signedAt },
    { type: "attestation", numero: "ATT-1", status: "valide", createdAt: signedAt },
  ],
  insuranceContracts: [
    { productType: "do", contractNumber: "DO-9", createdAt: signedAt },
    { productType: "rc_fabriquant", contractNumber: "  ", createdAt: signedAt },
  ],
  pending: [
    {
      signatureRequestId: "req-do",
      contractNumero: "DO-10",
      contractData: JSON.stringify({
        customUploadedDevisFlow: true,
        produitLabel: "Dommage ouvrage",
        afterSignNextPath: "/espace-client",
      }),
      createdAt: signedAt,
    },
  ],
})
assert(signed.signed && signed.summary === "Contrat signé", "un contrat valide doit marquer la fiche signée")
assert(signed.contracts.some((row) => row.label === "Décennale" && row.numero === "DEC-1"), "le contrat décennale compte")
assert(!signed.contracts.some((row) => row.numero === "DEC-OLD"), "un contrat résilié ne compte pas")
assert(!signed.contracts.some((row) => row.numero === "ATT-1"), "une attestation n'est pas le contrat")
assert(signed.contracts.some((row) => row.label === "Dommage ouvrage" && row.numero === "DO-9"), "le contrat plateforme compte")
assert(signed.pending.length === 1 && signed.pending[0]?.label === "Dommage ouvrage", "la signature en attente reste listée")

const empty = describeClientSignature({ documents: [], insuranceContracts: [], pending: [] })
assert(!empty.signed && empty.summary === "Contrat non signé", "sans contrat la fiche reste non signée")
assert(empty.pending.length === 0, "sans demande en attente il n'y a rien à relancer")

const decennaleLink = signatureReminderPayload(
  {
    signatureRequestId: "abc-123",
    contractNumero: "DEC-22",
    contractData: JSON.stringify({ devisReference: "DEV-22" }),
  },
  "Atelier Martin",
  "https://www.optimum-assurance.fr/"
)
assert(decennaleLink.produitLabel === "contrat décennale", "la relance décennale garde le libellé du cron")
assert(decennaleLink.reference === "DEV-22", "la référence du devis est reprise")
assert(
  decennaleLink.signatureLink ===
    "https://www.optimum-assurance.fr/sign/abc-123?next=%2Fmandat-sepa",
  "le lien décennale réutilise la demande déjà ouverte"
)

const customLink = signatureReminderPayload(
  {
    signatureRequestId: "pdf-9",
    contractNumero: "PDF-9",
    contractData: JSON.stringify({
      customUploadedDevisFlow: true,
      produitLabel: "Assurance titre",
      afterSignNextPath: "https://evil.example",
    }),
  },
  "Cabinet",
  "https://www.optimum-assurance.fr"
)
assert(customLink.produitLabel === "Assurance titre", "le flux PDF garde le produit")
assert(customLink.signatureLink.includes("next=%2Fespace-client"), "un next externe retombe sur l'espace client")

const reminded = describeClientSignature({
  documents: [],
  insuranceContracts: [],
  pending: [
    {
      signatureRequestId: "req-1",
      contractNumero: "DEC-1",
      contractData: "{}",
      createdAt: signedAt,
    },
  ],
  siteUrl: "https://www.optimum-assurance.fr",
  reminderLogs: [
    {
      action: "signature_relance_manuelle",
      details: JSON.stringify({ signatureRequestId: "req-1", emailSent: false }),
      createdAt: "2026-04-02T08:00:00.000Z",
    },
    {
      action: "signature_relance_manuelle",
      details: JSON.stringify({ signatureRequestId: "req-1", emailSent: true }),
      createdAt: "2026-04-01T08:00:00.000Z",
    },
    {
      action: "cron_signature_reminder_client_sent",
      targetType: "pending_signature",
      targetId: "req-1",
      createdAt: "2026-04-03T08:00:00.000Z",
    },
  ],
})
assert(
  reminded.pending[0]?.remindedAt === "2026-04-03T08:00:00.000Z",
  "la date Relancé le retient le dernier envoi réussi"
)
assert(
  reminded.pending[0]?.signatureLink === "https://www.optimum-assurance.fr/sign/req-1?next=%2Fmandat-sepa",
  "le lien copiable est celui déjà ouvert"
)
const failedOnly = latestSignatureReminderByRequest([
  {
    action: "signature_relance_manuelle",
    details: JSON.stringify({ signatureRequestId: "req-1", emailSent: false }),
    createdAt: "2026-04-02T08:00:00.000Z",
  },
])
assert(failedOnly.size === 0, "un email non parti ne date pas la relance")

const activity = describeClientActivity([
  {
    id: "log-1",
    action: "cron_signature_reminder_client_sent",
    adminEmail: "cron@system",
    createdAt: "2026-04-03T08:00:00.000Z",
  },
])
assert(activity[0]?.actionLabel === "Rappel de signature envoyé", "la fiche traduit le rappel cron")

assert(
  adminActivityLabel("signature_relance_manuelle") === "Signature électronique relancée",
  "le journal nomme la relance manuelle"
)

const route = readFileSync("app/api/gestion/clients/[id]/relance-signature/route.ts", "utf8")
assert(route.includes("rappelSignatureEnAttente"), "la relance envoie le rappel existant")
assert(route.includes('isReminderUnsubscribed(email, "signature")'), "la désinscription signature est respectée")
assert(!route.includes("createSignRequest"), "la fiche ne crée pas de nouvelle demande")
assert(!route.includes("payments.create"), "la relance ne crée pas de paiement")

const fiche = readFileSync("app/gestion/clients/[id]/page.tsx", "utf8")
assert(fiche.includes("Relancer la signature"), "la fiche affiche le bouton de relance")
assert(fiche.includes("Copier le lien"), "la fiche copie le lien déjà ouvert")
assert(fiche.includes("Relancé le"), "la fiche affiche la date de relance")
assert(fiche.includes("Dernières actions"), "la fiche affiche le journal du client")
assert(fiche.includes("Contrat signé"), "la fiche affiche l'indicateur signé")
assert(fiche.includes("Aucune signature en attente à relancer."), "sans demande le bouton de création est absent")
assert(!fiche.includes("createSignRequest"), "la page ne crée pas de signature")

const getRoute = readFileSync("app/api/gestion/clients/[id]/route.ts", "utf8")
assert(getRoute.includes("describeClientSignature"), "le GET fiche calcule l'état de signature")
assert(getRoute.includes("describeClientActivity"), "le GET fiche prépare les dernières actions")
assert(getRoute.includes("pendingSignature.findMany"), "le GET lit les signatures déjà ouvertes")
assert(getRoute.includes("siteUrl: SITE_URL"), "le lien copiable utilise l'adresse publique")

const dashboardRoute = readFileSync("app/api/gestion/dashboard/route.ts", "utf8")
assert(dashboardRoute.includes("latestSignatureReminderByRequest"), "le tableau de bord date les relances")
assert(dashboardRoute.includes("href: p.userId ? `/gestion/clients/${p.userId}`"), "l'action signature ouvre la fiche")
assert(!dashboardRoute.includes("createSignRequest"), "le tableau de bord ne crée pas de signature")

const dashboardPage = readFileSync("app/gestion/page.tsx", "utf8")
assert(dashboardPage.includes("Signatures en attente"), "le tableau de bord liste les signatures ouvertes")
assert(dashboardPage.includes("Relancé le"), "la liste indique la dernière relance")
assert(!dashboardPage.includes("relance-signature"), "la liste du tableau de bord n'envoie pas de rappel")

const cron = readFileSync("app/api/cron/rappel-signatures-en-attente/route.ts", "utf8")
assert(cron.includes("signatureReminderPayload(pending, userLabel, SITE_URL)"), "le cron réutilise le même lien")
assert(!cron.includes("function getSignatureReminderPayload"), "le cron n'a plus sa copie locale du lien")

console.log("verify-signature-fiche: ok")
