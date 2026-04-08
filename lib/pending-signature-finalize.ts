/**
 * Finalisation contrat après signature (POST /api/sign — Supabase Sign).
 */
import type { PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { SITE_URL } from "@/lib/site-url"
import { logContractAction } from "@/lib/insurance-contract-service"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { IDENTITY_DOC_KEYS, syncUserFromDocumentMergedData } from "@/lib/sync-user-document-identity"

export type PendingFinalizeOptions = {
  /** Objet fichier dans le bucket « signed » (PDF signé) — flux devis PDF personnalisé */
  signedQuoteStorageKey?: string
}

function dateMoins3Mois(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().split("T")[0]
}

/**
 * Crée contrat décennale (Document Prisma) ou contrat plateforme `rc_fabriquant` (InsuranceContract),
 * puis supprime le pending.
 */
export async function applyPendingFinalize(
  pending: PendingSignature,
  options?: PendingFinalizeOptions
): Promise<void> {
  const raw = JSON.parse(pending.contractData) as Record<string, unknown>

  if (raw.customUploadedDevisFlow === true) {
    const user = await prisma.user.findUnique({ where: { id: pending.userId } })
    if (!user) {
      throw new Error("Utilisateur introuvable pour finaliser le devis PDF.")
    }
    const premium = Number(raw.primeTtc)
    if (!Number.isFinite(premium) || premium <= 0) {
      throw new Error("Montant TTC invalide dans le dossier de signature.")
    }
    const signedKey = options?.signedQuoteStorageKey?.trim()
    if (!signedKey) {
      throw new Error("Clé du PDF signé manquante — finalisation impossible.")
    }

    const contractNumber = await allocateNextContractNumber("rc_fabriquant")
    const address =
      [user.adresse, user.codePostal, user.ville].filter(Boolean).join(" ").trim() || "—"

    const c = await prisma.insuranceContract.create({
      data: {
        contractNumber,
        userId: user.id,
        productType: "rc_fabriquant",
        clientName: (user.raisonSociale || user.email).trim(),
        siret: user.siret ?? undefined,
        address,
        premium,
        status: CONTRACT_STATUS.approved,
        insurerValidatedAt: new Date(),
        signedQuoteStorageKey: signedKey,
      },
    })

    const baseUrl = `${SITE_URL}/api/contracts/${c.id}/pdf`
    await prisma.contractStoredDocument.createMany({
      data: [
        { contractId: c.id, type: "quote", url: `${baseUrl}/quote` },
        { contractId: c.id, type: "policy", url: `${baseUrl}/policy` },
      ],
    })

    await logContractAction(c.id, "created_from_custom_devis_pdf", {
      signatureRequestId: pending.signatureRequestId,
      devisReference: raw.devisReference,
      produitLabel: raw.produitLabel,
    })

    await prisma.pendingSignature.delete({
      where: { signatureRequestId: pending.signatureRequestId },
    })
    return
  }

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

  const identitySubset: Record<string, unknown> = {}
  for (const key of IDENTITY_DOC_KEYS) {
    if (key in contractData) {
      identitySubset[key] = contractData[key]
    }
  }
  if (Object.keys(identitySubset).length > 0) {
    const sync = await syncUserFromDocumentMergedData(pending.userId, identitySubset)
    if (!sync.ok) {
      console.warn("[pending-signature-finalize] sync user identity skipped:", sync.error)
    }
  }

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
