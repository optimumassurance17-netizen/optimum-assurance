/**
 * Finalisation contrat après signature (POST /api/sign — Supabase Sign).
 */
import { Prisma, type PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { getNextNumero } from "@/lib/documents"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { SITE_URL } from "@/lib/site-url"
import { collapseDecennaleContractDuplicates } from "@/lib/decennale-contract-replacement"
import { logContractAction } from "@/lib/insurance-contract-service"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { IDENTITY_DOC_KEYS, syncUserFromDocumentMergedData } from "@/lib/sync-user-document-identity"
import {
  buildRcFabDossierConfig,
  normalizeRcFabPeriodicity,
  readRcFabDossierConfig,
  serializeRcFabDossierConfig,
  type RcFabPeriodicity,
} from "@/lib/rc-fabriquant-dossier-config"
import {
  buildAssuranceTitreContractConfig,
  readAssuranceTitreContractConfig,
  serializeAssuranceTitreContractConfig,
} from "@/lib/assurance-titre-contract-config"
import { normalizeInsurancePlatformProductType } from "@/lib/insurance-product"
import {
  FALLBACK_PDF_KEY,
  LOCAL_DOCUMENT_KEY_PREFIX,
  LOCAL_SIGNED_DOCUMENT_TYPE,
  LOCAL_SIGNED_PDF_KEY,
  MAX_LOCAL_SIGNED_PDF_BYTES,
  decodeStoredPdfBase64,
} from "@/lib/esign/local-signature-fallback"

export type PendingFinalizeOptions = {
  /** Objet fichier dans le bucket « signed » (PDF signé) — ancien flux Supabase */
  signedQuoteStorageKey?: string
  /** PDF signé conservé en base, sans Supabase */
  localSignedPdfBase64?: string
}

function dateMoins3Mois(dateIso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null
  const [y, m, d] = dateIso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(date.getTime())) return null
  date.setUTCMonth(date.getUTCMonth() - 3)
  return date.toISOString().split("T")[0]
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  )
}

export type PendingFinalizeResult = {
  documentId: string | null
}

/**
 * Crée le contrat décennale. Si le numéro est déjà pris, reprend le contrat de cette signature
 * ou en attribue un libre. Une pièce trop lourde est réessayée sans le PDF signé embarqué.
 */
function isContractFromThisSignature(
  existing: { userId: string; type: string; createdAt: Date } | null,
  userId: string,
  pendingCreatedAt: Date
): boolean {
  if (!existing || existing.userId !== userId || existing.type !== "contrat") return false
  return existing.createdAt.getTime() >= pendingCreatedAt.getTime() - 5_000
}

async function createDecennaleContractDocument(
  userId: string,
  preferredNumero: string,
  contractData: Record<string, unknown>,
  pendingCreatedAt: Date,
  signatureRequestId: string
): Promise<{ id: string }> {
  const keptContract = async (id: string) => {
    await collapseDecennaleContractDuplicates({ userId, keepDocumentId: id })
    return { id }
  }

  const already = await prisma.document.findUnique({ where: { numero: preferredNumero } })
  if (already && isContractFromThisSignature(already, userId, pendingCreatedAt)) {
    return keptContract(already.id)
  }

  let numero = already ? await getNextNumero("contrat") : preferredNumero
  let data: Record<string, unknown> = contractData
  let strippedPdf = false
  for (let attempt = 0; attempt < 3; attempt++) {
    if (numero !== preferredNumero) {
      await prisma.pendingSignature.update({
        where: { signatureRequestId },
        data: { contractNumero: numero },
      })
    }
    try {
      const created = await prisma.document.create({
        data: {
          userId,
          type: "contrat",
          numero,
          data: JSON.stringify(data),
          status: "valide",
        },
      })
      return keptContract(created.id)
    } catch (error) {
      if (isUniqueConstraint(error)) {
        const existing = await prisma.document.findUnique({ where: { numero } })
        if (existing && isContractFromThisSignature(existing, userId, pendingCreatedAt)) {
          return keptContract(existing.id)
        }
        numero = await getNextNumero("contrat")
        continue
      }
      if (!strippedPdf && LOCAL_SIGNED_PDF_KEY in data) {
        const copy = { ...data }
        delete copy[LOCAL_SIGNED_PDF_KEY]
        data = copy
        strippedPdf = true
        continue
      }
      throw error
    }
  }
  throw new Error("Création du contrat impossible.")
}

/**
 * Crée contrat décennale (Document Prisma) ou contrat plateforme `rc_fabriquant` (InsuranceContract),
 * puis supprime le pending.
 */
export async function applyPendingFinalize(
  pending: PendingSignature,
  options?: PendingFinalizeOptions
): Promise<PendingFinalizeResult> {
  const raw = JSON.parse(pending.contractData) as Record<string, unknown>

  if (raw.customUploadedDevisFlow === true) {
    const user = await prisma.user.findUnique({ where: { id: pending.userId } })
    if (!user) {
      throw new Error("Utilisateur introuvable pour finaliser le devis PDF.")
    }
    let signedKey = options?.signedQuoteStorageKey?.trim() || ""
    let localArchiveId: string | null = null
    if (!signedKey && options?.localSignedPdfBase64) {
      const signedBytes = decodeStoredPdfBase64(options.localSignedPdfBase64, MAX_LOCAL_SIGNED_PDF_BYTES)
      if (!signedBytes) {
        throw new Error("PDF signé illisible — finalisation impossible.")
      }
      const archive = await prisma.document.create({
        data: {
          userId: user.id,
          type: LOCAL_SIGNED_DOCUMENT_TYPE,
          numero: await getNextNumero(LOCAL_SIGNED_DOCUMENT_TYPE),
          data: JSON.stringify({
            [LOCAL_SIGNED_PDF_KEY]: options.localSignedPdfBase64,
            signatureRequestId: pending.signatureRequestId,
          }),
          status: "valide",
        },
      })
      localArchiveId = archive.id
      signedKey = `${LOCAL_DOCUMENT_KEY_PREFIX}${archive.id}`
    }
    if (!signedKey) {
      throw new Error("Clé du PDF signé manquante — finalisation impossible.")
    }

    const productType = normalizeInsurancePlatformProductType(raw.productType, "rc_fabriquant")
    const premiumRaw = Number(raw.primeTtc)
    const primeAnnuelleTtcRaw = Number(raw.primeAnnuelleTtc)
    const primeAnnuelleHtRaw = Number(raw.primeAnnuelleHt)
    let premium =
      Number.isFinite(premiumRaw) && premiumRaw > 0
        ? Math.round(premiumRaw * 100) / 100
        : Number.isFinite(primeAnnuelleTtcRaw) && primeAnnuelleTtcRaw > 0
          ? Math.round(primeAnnuelleTtcRaw * 100) / 100
          : Number.NaN
    if (!Number.isFinite(premium) || premium <= 0) {
      throw new Error("Montant TTC invalide dans le dossier de signature.")
    }

    const contractNumber = await allocateNextContractNumber(productType)
    const address =
      [user.adresse, user.codePostal, user.ville].filter(Boolean).join(" ").trim() || "—"
    let exclusionsJson = ""
    let logDetails: Record<string, unknown>

    if (productType === "assurance_titre") {
      const baseConfig =
        typeof raw.assuranceTitreContractConfigSerialized === "string" &&
        raw.assuranceTitreContractConfigSerialized.trim().length > 0
          ? readAssuranceTitreContractConfig(
              raw.assuranceTitreContractConfigSerialized,
              Number.isFinite(primeAnnuelleTtcRaw) && primeAnnuelleTtcRaw > 0
                ? primeAnnuelleTtcRaw
                : premium,
              contractNumber
            )
          : buildAssuranceTitreContractConfig({
              referenceContrat: contractNumber,
              primeAnnuelleTtc:
                Number.isFinite(primeAnnuelleTtcRaw) && primeAnnuelleTtcRaw > 0
                  ? primeAnnuelleTtcRaw
                  : premium,
              primeAnnuelleHt:
                Number.isFinite(primeAnnuelleHtRaw) && primeAnnuelleHtRaw > 0
                  ? primeAnnuelleHtRaw
                  : undefined,
              coverageDurationYears: Number(raw.coverageDurationYears),
              productLabel:
                typeof raw.produitLabel === "string" ? raw.produitLabel : "Assurance titre — proposition digitale",
            })
      const dossierConfig = buildAssuranceTitreContractConfig({
        referenceContrat: contractNumber,
        primeAnnuelleTtc: baseConfig.primeAnnuelleTtc,
        primeAnnuelleHt: baseConfig.primeAnnuelleHt,
        coverageDurationYears: baseConfig.coverageDurationYears,
        productLabel:
          typeof raw.produitLabel === "string" && raw.produitLabel.trim()
            ? raw.produitLabel
            : baseConfig.productLabel,
        dossier: baseConfig.dossier,
      })
      premium = dossierConfig.montantParEcheanceTtc
      exclusionsJson = serializeAssuranceTitreContractConfig(dossierConfig)
      logDetails = {
        signatureRequestId: pending.signatureRequestId,
        devisReference: raw.devisReference,
        produitLabel: raw.produitLabel,
        primeAnnuelleTtc: dossierConfig.primeAnnuelleTtc,
        primeAnnuelleHt: dossierConfig.primeAnnuelleHt,
        coverageDurationYears: dossierConfig.coverageDurationYears,
      }
    } else {
      const periodiciteRaw =
        typeof raw.periodicitePaiement === "string"
          ? raw.periodicitePaiement
          : typeof raw.periodicite === "string"
            ? raw.periodicite
            : undefined
      const periodicite = normalizeRcFabPeriodicity(periodiciteRaw)
      const primeAnnuelleTtc =
        Number.isFinite(primeAnnuelleTtcRaw) && primeAnnuelleTtcRaw > 0
          ? Math.round(primeAnnuelleTtcRaw * 100) / 100
          : Math.round(premium * 4 * 100) / 100
      const primeAnnuelleHt =
        Number.isFinite(primeAnnuelleHtRaw) && primeAnnuelleHtRaw > 0
          ? Math.round(primeAnnuelleHtRaw * 100) / 100
          : Math.round((primeAnnuelleTtc / 1.2) * 100) / 100
      const storedConfig =
        typeof raw.rcFabriquantDossierConfigSerialized === "string"
          ? readRcFabDossierConfig(raw.rcFabriquantDossierConfigSerialized, primeAnnuelleTtc, contractNumber)
          : null
      const dossierConfig = buildRcFabDossierConfig({
        referenceContrat: contractNumber,
        periodicite: periodicite as RcFabPeriodicity,
        primeAnnuelleTtc,
        primeAnnuelleHt,
        activite: storedConfig?.activite,
        demandeLignes: storedConfig?.demandeLignes,
      })
      premium = dossierConfig.montantParEcheanceTtc
      exclusionsJson = serializeRcFabDossierConfig(dossierConfig)
      logDetails = {
        signatureRequestId: pending.signatureRequestId,
        devisReference: raw.devisReference,
        produitLabel: raw.produitLabel,
        periodicitePaiement: dossierConfig.periodicite,
        primeAnnuelleTtc,
        primeAnnuelleHt,
      }
    }

    let c: Awaited<ReturnType<typeof prisma.insuranceContract.create>>
    try {
      c = await prisma.insuranceContract.create({
        data: {
          contractNumber,
          userId: user.id,
          productType,
          clientName: (user.raisonSociale || user.email).trim(),
          siret: user.siret ?? undefined,
          address,
          premium,
          status: CONTRACT_STATUS.approved,
          insurerValidatedAt: new Date(),
          signedQuoteStorageKey: signedKey,
          exclusionsJson,
        },
      })
    } catch (error) {
      if (localArchiveId) {
        await prisma.document.delete({ where: { id: localArchiveId } }).catch(() => undefined)
      }
      throw error
    }

    const baseUrl = `${SITE_URL}/api/contracts/${c.id}/pdf`
    await prisma.contractStoredDocument.createMany({
      data: [
        { contractId: c.id, type: "quote", url: `${baseUrl}/quote` },
        { contractId: c.id, type: "policy", url: `${baseUrl}/policy` },
      ],
    })

    await logContractAction(c.id, "created_from_custom_devis_pdf", {
      productType,
      ...logDetails,
      ...(typeof raw.sourceLeadType === "string" ? { sourceLeadType: raw.sourceLeadType } : {}),
      ...(typeof raw.sourceLeadId === "string" ? { sourceLeadId: raw.sourceLeadId } : {}),
    })
    if (productType === "rc_fabriquant") {
      const periodiciteLabel =
        typeof logDetails.periodicitePaiement === "string" ? logDetails.periodicitePaiement : "trimestrielle"
      const primeAnnuelleTtcValue =
        typeof logDetails.primeAnnuelleTtc === "number" ? logDetails.primeAnnuelleTtc : premium
      await logAdminActivity({
        adminEmail: "dda@system",
        action: "dda_rc_fabriquant_contract_suitability_checked",
        targetType: "insurance_contract",
        targetId: c.id,
        details: {
          source: "pending_signature_finalize",
          signatureRequestId: pending.signatureRequestId,
          produit: "rc-fabriquant",
          sourcePage: "rc_fabriquant_result",
          sourcePath: "/devis/rcpro/result",
          recommendedProduct: "rc-fabriquant",
          needsSummary: [
            `Société: ${c.clientName}`,
            c.siret ? `SIRET: ${c.siret}` : null,
            `Périodicité: ${periodiciteLabel}`,
            `Prime annuelle TTC: ${primeAnnuelleTtcValue.toLocaleString("fr-FR")} €`,
          ]
            .filter(Boolean)
            .join(" | "),
          suitability:
            "Adéquation RC fabricant validée après signature du devis personnalisé et création du contrat plateforme.",
        },
      })
    }

    await prisma.pendingSignature.delete({
      where: { signatureRequestId: pending.signatureRequestId },
    })
    return { documentId: null }
  }

  const contractData = { ...raw }
  delete contractData.signatureProvider
  delete contractData[FALLBACK_PDF_KEY]

  const created = await createDecennaleContractDocument(
    pending.userId,
    pending.contractNumero,
    contractData,
    pending.createdAt,
    pending.signatureRequestId
  )

  const identitySubset: Record<string, unknown> = {}
  for (const key of IDENTITY_DOC_KEYS) {
    if (key in contractData) {
      identitySubset[key] = contractData[key]
    }
  }
  if (Object.keys(identitySubset).length > 0) {
    try {
      const sync = await syncUserFromDocumentMergedData(pending.userId, identitySubset)
      if (!sync.ok) {
        console.warn("[pending-signature-finalize] sync user identity skipped:", sync.error)
      }
    } catch (error) {
      console.warn("[pending-signature-finalize] sync user identity skipped:", error)
    }
  }

  try {
    const jamaisAssure = Boolean(contractData.jamaisAssure)
    const reprisePasse = Boolean(contractData.reprisePasse)
    const dateEffetIso = typeof contractData.dateEffetIso === "string" ? contractData.dateEffetIso : ""
    const dateCreationSociete =
      typeof contractData.dateCreationSociete === "string" ? contractData.dateCreationSociete : ""

    const doitCreerAttestation =
      Boolean(dateEffetIso) && ((jamaisAssure && Boolean(dateCreationSociete)) || reprisePasse)

    if (doitCreerAttestation) {
      const dateDebut = jamaisAssure && dateCreationSociete ? dateCreationSociete : dateMoins3Mois(dateEffetIso)
      if (dateDebut) {
        const motif = jamaisAssure && dateCreationSociete ? "jamais_assure" : "reprise_passe"
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
    }
  } catch (error) {
    console.warn("[pending-signature-finalize] attestation non sinistralité non créée:", error)
  }

  await prisma.pendingSignature.delete({
    where: { signatureRequestId: pending.signatureRequestId },
  })
  return { documentId: created.id }
}
