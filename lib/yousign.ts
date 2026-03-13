/**
 * Client API Yousign v3
 * Documentation: https://developers.yousign.com/
 */

const YOUSIGN_SANDBOX = "https://api-sandbox.yousign.app/v3"
const YOUSIGN_PROD = "https://api.yousign.app/v3"

function getBaseUrl(): string {
  const env = process.env.YOUSIGN_ENV || "sandbox"
  return env === "production" ? YOUSIGN_PROD : YOUSIGN_SANDBOX
}

export interface YousignSignerInfo {
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  locale?: string
}

export interface CreateSignatureRequestParams {
  name: string
  signerInfo: YousignSignerInfo
  redirectUrls?: {
    success?: string
    error?: string
  }
}

export interface SignatureRequestResult {
  id: string
  status: string
  signers: { id: string; signature_link?: string }[]
}

export async function createSignatureRequest(
  pdfBuffer: Buffer,
  filename: string,
  params: CreateSignatureRequestParams
): Promise<SignatureRequestResult> {
  const apiKey = process.env.YOUSIGN_API_KEY
  if (!apiKey) {
    throw new Error("YOUSIGN_API_KEY non configuré")
  }

  const baseUrl = getBaseUrl()

  // 1. Créer la Signature Request (brouillon)
  const createRes = await fetch(`${baseUrl}/signature_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      delivery_mode: "none",
      timezone: "Europe/Paris",
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Yousign create failed: ${err}`)
  }

  const signatureRequest = await createRes.json()
  const signatureRequestId = signatureRequest.id

  // 2. Upload du document PDF
  const formData = new FormData()
  formData.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename)
  formData.append("nature", "signable_document")
  formData.append("parse_anchors", "false")

  const uploadRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Yousign upload failed: ${err}`)
  }

  const uploadResult = await uploadRes.json()
  const documentId = uploadResult.id || uploadResult.document?.id
  if (!documentId) {
    throw new Error("Yousign: document ID non reçu")
  }

  // 3. Ajouter le signataire
  const [firstName, ...lastNameParts] = (params.signerInfo.first_name || " ").split(" ")
  const signerLastName = lastNameParts.length > 0 ? lastNameParts.join(" ") : params.signerInfo.last_name || ""

  const signerRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/signers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        first_name: firstName || params.signerInfo.first_name,
        last_name: signerLastName || params.signerInfo.last_name,
        email: params.signerInfo.email,
        phone_number: params.signerInfo.phone_number || undefined,
        locale: params.signerInfo.locale || "fr",
      },
      signature_level: "electronic_signature",
      signature_authentication_mode: "no_otp",
      redirect_urls: params.redirectUrls
        ? {
            success: params.redirectUrls.success,
            error: params.redirectUrls.error || params.redirectUrls.success,
          }
        : undefined,
      fields: [
        {
          document_id: documentId,
          type: "signature",
          page: 1,
          x: 100,
          y: 650,
          width: 200,
          height: 50,
        },
      ],
    }),
  })

  if (!signerRes.ok) {
    const err = await signerRes.text()
    throw new Error(`Yousign signer failed: ${err}`)
  }

  // 4. Activer la Signature Request
  const activateRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}/activate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!activateRes.ok) {
    const err = await activateRes.text()
    throw new Error(`Yousign activate failed: ${err}`)
  }

  await activateRes.json()

  const getRes = await fetch(`${baseUrl}/signature_requests/${signatureRequestId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const fullRequest = await getRes.json()

  return {
    id: fullRequest.id,
    status: fullRequest.status,
    signers: fullRequest.signers || [],
  }
}

export async function getSignatureRequest(id: string): Promise<{ status: string }> {
  const apiKey = process.env.YOUSIGN_API_KEY
  if (!apiKey) throw new Error("YOUSIGN_API_KEY non configuré")

  const res = await fetch(`${getBaseUrl()}/signature_requests/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error("Yousign get failed")
  return res.json()
}
