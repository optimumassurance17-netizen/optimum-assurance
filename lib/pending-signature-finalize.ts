/**
 * Finalisation contrat après signature (POST /api/sign — Supabase Sign).
 */
import type { PendingSignature } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"

function dateMoins3Mois(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().split("T")[0]
}

/** Crée contrat + attestation si besoin, supprime le pending (logique identique à l’ancien webhook). */
export async function applyPendingFinalize(pending: PendingSignature): Promise<void> {
  const raw = JSON.parse(pending.contractData) as Record<string, unknown>
  const contractData = { ...raw }
  delete contractData.signatureProvider

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
