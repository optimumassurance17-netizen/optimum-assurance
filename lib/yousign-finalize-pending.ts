/**
 * Finalisation contrat après signature Yousign (webhook ou secours API).
 */
import type { PendingSignature } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { getSignatureRequest } from "@/lib/yousign"

function dateMoins3Mois(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().split("T")[0]
}

/** Crée contrat + attestation si besoin, supprime le pending (logique identique au webhook). */
export async function applyPendingFinalize(pending: PendingSignature): Promise<void> {
  const contractData = JSON.parse(pending.contractData) as Record<string, unknown>

  await prisma.document.create({
    data: {
      userId: pending.userId,
      type: "contrat",
      numero: pending.contractNumero,
      data: JSON.stringify(contractData),
      status: "valide",
    },
  })

  const jamaisAssure = Boolean(contractData.jamaisAssure)
  const reprisePasse = Boolean(contractData.reprisePasse)
  const dateEffetIso = contractData.dateEffetIso as string | undefined
  const dateCreationSociete = contractData.dateCreationSociete as string | undefined

  const doitCreerAttestation =
    dateEffetIso && ((jamaisAssure && dateCreationSociete) || reprisePasse)

  if (doitCreerAttestation) {
    let dateDebut: string
    let motif: "jamais_assure" | "reprise_passe"

    if (jamaisAssure && dateCreationSociete) {
      dateDebut = dateCreationSociete
      motif = "jamais_assure"
    } else {
      dateDebut = dateMoins3Mois(dateEffetIso)
      motif = "reprise_passe"
    }

    const attestationData = {
      raisonSociale: contractData.raisonSociale,
      siret: contractData.siret || "",
      adresse: contractData.adresse,
      codePostal: contractData.codePostal,
      ville: contractData.ville,
      dateDebut,
      dateFin: dateEffetIso,
      motif,
    }

    const numeroAns = await getNextNumero("attestation_non_sinistralite")
    await prisma.document.create({
      data: {
        userId: pending.userId,
        type: "attestation_non_sinistralite",
        numero: numeroAns,
        data: JSON.stringify(attestationData),
        status: "valide",
      },
    })
  }

  await prisma.pendingSignature.delete({
    where: { signatureRequestId: pending.signatureRequestId },
  })
}

export type FinalizeSyncResult = "created" | "not_found" | "not_ready" | "skipped"

/**
 * Secours si webhook pas encore actif : vérifie le statut Yousign puis applique la même finalisation.
 * Idempotent si le contrat existe déjà (webhook arrivé entre-temps).
 */
export async function finalizePendingIfYousignDone(
  signatureRequestId: string,
  expectedUserId: string
): Promise<FinalizeSyncResult> {
  const sr = await getSignatureRequest(signatureRequestId)
  const st = String(sr.status || "").toLowerCase()
  if (st !== "done" && st !== "completed") {
    return "not_ready"
  }

  const pending = await prisma.pendingSignature.findUnique({
    where: { signatureRequestId },
  })
  if (!pending) {
    return "not_found"
  }

  if (pending.userId !== expectedUserId) {
    return "not_found"
  }

  const duplicate = await prisma.document.findFirst({
    where: {
      userId: pending.userId,
      type: "contrat",
      numero: pending.contractNumero,
    },
  })
  if (duplicate) {
    await prisma.pendingSignature.deleteMany({ where: { signatureRequestId } })
    return "skipped"
  }

  await applyPendingFinalize(pending)
  return "created"
}
