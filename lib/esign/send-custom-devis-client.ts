import { SIGNATURE_PDF_UPLOAD_CHUNK_BYTES } from "@/lib/esign/local-signature-fallback"

const ENDPOINT = "/api/gestion/sign/send-custom-devis-pdf"

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const step = 0x8000
  for (let offset = 0; offset < bytes.byteLength; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step))
  }
  return btoa(binary)
}

/** Envoie le devis. Au-dessus de 2 Mo, le fichier part en morceaux pour rester sous le plafond de l'hébergement. */
export async function postCustomDevisPdf(file: File, fields: Record<string, string>): Promise<Response> {
  if (file.size <= SIGNATURE_PDF_UPLOAD_CHUNK_BYTES) {
    const body = new FormData()
    body.append("pdf", file)
    for (const [key, value] of Object.entries(fields)) body.append(key, value)
    return fetch(ENDPOINT, { method: "POST", body })
  }

  const token = crypto.randomUUID()
  const total = Math.ceil(file.size / SIGNATURE_PDF_UPLOAD_CHUNK_BYTES)
  for (let index = 0; index < total; index += 1) {
    const slice = file.slice(
      index * SIGNATURE_PDF_UPLOAD_CHUNK_BYTES,
      (index + 1) * SIGNATURE_PDF_UPLOAD_CHUNK_BYTES
    )
    const data = bytesToBase64(new Uint8Array(await slice.arrayBuffer()))
    const chunkRes = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfChunk: { token, index, total, data } }),
    })
    if (!chunkRes.ok) return chunkRes
  }

  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfUploadToken: token, ...fields }),
  })
}
