import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"
import { prepareDoContractForPdf } from "@/lib/do-attestation-source"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import { logContractAction } from "@/lib/insurance-contract-service"
import { createSignRequestWithFallback } from "@/lib/esign/create-sign-request-with-fallback"
import { readContractObject } from "@/lib/esign/local-signature-fallback"
import { validateSignatureQualityGate } from "@/lib/signature-quality-gates"
import {
  DO_QUOTE_AFTER_SIGN_PATH,
  doQuotePaymentAllowed,
  isDoQuoteSignatureData,
} from "@/lib/do-quote-signature-rules"

export type OpenDoQuoteSignatureResult =
  | {
      ok: true
      alreadySigned: boolean
      signatureLink: string | null
      signatureRequestId: string | null
      created: boolean
    }
  | { ok: false; status: number; error: string }

function signatureUrl(signatureRequestId: string): string {
  return `${SITE_URL}/sign/${signatureRequestId}?next=${encodeURIComponent(DO_QUOTE_AFTER_SIGN_PATH)}`
}

/**
 * Ouvre (ou retrouve) la signature du devis DO déjà émis.
 * N'envoie pas l'email : l'appelant place le lien dans le message du devis.
 */
export async function openDoQuoteSignature(contractId: string): Promise<OpenDoQuoteSignatureResult> {
  const contract = await prisma.insuranceContract.findUnique({
    where: { id: contractId },
    include: { user: { select: { id: true, email: true, raisonSociale: true } } },
  })
  if (!contract || contract.productType !== "do") {
    return { ok: false, status: 404, error: "Devis dommage ouvrage introuvable." }
  }
  if (contract.status === "rejected") {
    return { ok: false, status: 400, error: "Impossible de signer un devis refusé." }
  }
  if (doQuotePaymentAllowed(contract.productType, contract.signedQuoteStorageKey)) {
    return {
      ok: true,
      alreadySigned: true,
      signatureLink: null,
      signatureRequestId: null,
      created: false,
    }
  }
  if (!contract.userId) {
    return { ok: false, status: 400, error: "Rattachez un compte client avant d'envoyer le devis à signer." }
  }

  const email = contract.user?.email?.trim().toLowerCase() || ""
  const clientLabel = contract.user?.raisonSociale?.trim() || contract.clientName.trim()
  const existingRows = await prisma.pendingSignature.findMany({
    where: { userId: contract.userId },
    select: { signatureRequestId: true, contractData: true },
  })
  for (const row of existingRows) {
    const data = readContractObject(row.contractData)
    if (isDoQuoteSignatureData(data) && data.insuranceContractId === contract.id) {
      return {
        ok: true,
        alreadySigned: false,
        signatureLink: signatureUrl(row.signatureRequestId),
        signatureRequestId: row.signatureRequestId,
        created: false,
      }
    }
  }
  if (existingRows.length > 0) {
    return {
      ok: false,
      status: 409,
      error:
        "Une demande de signature est déjà en attente pour ce client. Finalisez ou annulez-la avant d'en créer une nouvelle.",
    }
  }

  let pdfBytes: Uint8Array
  try {
    const ready = await prepareDoContractForPdf(contract)
    pdfBytes = await renderContractPdf(ready, "quote")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Le PDF du devis est illisible."
    return { ok: false, status: 422, error: message }
  }

  const qualityError = validateSignatureQualityGate({
    flow: "custom_pdf",
    annualTtc: contract.premium,
    periodicity: "annuel",
    clientLabel,
    reference: contract.contractNumber,
    email,
    hasPdfFile: pdfBytes.byteLength > 80,
  })
  if (qualityError) {
    return { ok: false, status: 400, error: qualityError }
  }

  const created = await createSignRequestWithFallback(Buffer.from(pdfBytes))
  await prisma.pendingSignature.create({
    data: {
      signatureRequestId: created.id,
      userId: contract.userId,
      contractNumero: contract.contractNumber,
      contractData: JSON.stringify({
        doQuoteFlow: true,
        insuranceContractId: contract.id,
        productType: "do",
        primeTtc: contract.premium,
        raisonSociale: clientLabel,
        email,
        produitLabel: "Devis dommage ouvrage",
        afterSignNextPath: DO_QUOTE_AFTER_SIGN_PATH,
        signatureProvider: created.signatureProvider,
        fallbackPdfBase64: created.fallbackPdfBase64,
      }),
    },
  })

  await logContractAction(contract.id, "do_quote_signature_opened", {
    signatureRequestId: created.id,
    contractNumber: contract.contractNumber,
  })

  return {
    ok: true,
    alreadySigned: false,
    signatureLink: signatureUrl(created.id),
    signatureRequestId: created.id,
    created: true,
  }
}

export async function deleteDoQuoteSignatureRequest(signatureRequestId: string): Promise<void> {
  await prisma.pendingSignature.deleteMany({ where: { signatureRequestId } })
}
