export const DOCUMENT_REQUEST_ACTION = "document_request_sent"
export const DOCUMENT_REQUEST_MIN_LENGTH = 8
export const DOCUMENT_REQUEST_MAX_LENGTH = 2000

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  devis: "devis",
  devis_do: "devis dommage-ouvrage",
  contrat: "contrat",
  attestation: "attestation décennale",
  attestation_nominative: "attestation nominative",
  attestation_do: "attestation dommage-ouvrage",
  attestation_non_sinistralite: "attestation de non-sinistralité",
  avenant: "avenant",
  facture_do: "facture dommage-ouvrage",
  facture_decennale: "facture décennale",
}

export type DocumentRequestScope = {
  assuranceLabel: string
  scopePhrase: string
  subject: string
}

export type StoredDocumentRequest = {
  id: string
  message: string
  assuranceLabel: string
  sentTo: string
  adminEmail: string
  createdAt: string
}

export function parseDocumentRequestMessage(
  raw: unknown
): { ok: true; message: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Écrivez le document demandé, en au moins 8 caractères." }
  }
  const message = raw.replace(/\u0000/g, "").trim()
  if (message.length < DOCUMENT_REQUEST_MIN_LENGTH) {
    return { ok: false, error: "Écrivez le document demandé, en au moins 8 caractères." }
  }
  if (message.length > DOCUMENT_REQUEST_MAX_LENGTH) {
    return { ok: false, error: "Le message dépasse 2 000 caractères." }
  }
  return { ok: true, message }
}

export function documentTypeAssuranceLabel(type: string | null | undefined): string {
  const key = type?.trim() || ""
  return DOCUMENT_TYPE_LABELS[key] ?? "document"
}

/** Libellé affiché et phrase du mail. Sans produit, la demande porte sur le dossier du client. */
export function documentRequestScope(input: {
  productLabel?: string | null
  reference?: string | null
}): DocumentRequestScope {
  const product = input.productLabel?.trim() || ""
  const reference = input.reference?.trim() || ""
  if (!product) {
    return {
      assuranceLabel: "Dossier client",
      scopePhrase: "votre dossier",
      subject: "Document à transmettre pour votre dossier",
    }
  }
  const assuranceLabel = reference ? `${product} ${reference}` : product
  const scopePhrase = reference
    ? `votre assurance ${product} n° ${reference}`
    : `votre assurance ${product}`
  return {
    assuranceLabel,
    scopePhrase,
    subject: `Document à transmettre — ${assuranceLabel}`,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildDocumentRequestEmail(input: {
  clientLabel: string
  message: string
  scopePhrase: string
  subject: string
  espaceClientUrl: string
}): { subject: string; text: string; html: string } {
  const clientLabel = input.clientLabel.trim() || "Madame, Monsieur"
  const text = [
    `Bonjour ${clientLabel},`,
    "",
    `Nous vous demandons un document pour ${input.scopePhrase}.`,
    "",
    "Message :",
    input.message,
    "",
    "Déposez la pièce dans votre espace client :",
    input.espaceClientUrl,
    "",
    "Cette demande ne confirme pas que le dossier est garanti.",
    "",
    "Cordialement,",
    "Optimum Assurance",
  ].join("\n")
  const html = [
    `<p>Bonjour ${escapeHtml(clientLabel)},</p>`,
    `<p>Nous vous demandons un document pour ${escapeHtml(input.scopePhrase)}.</p>`,
    `<p><strong>Message :</strong><br>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p>`,
    `<p><a href="${escapeHtml(input.espaceClientUrl)}">Déposer le document dans l'espace client</a></p>`,
    `<p>Cette demande ne confirme pas que le dossier est garanti.</p>`,
    `<p>Cordialement,<br>Optimum Assurance</p>`,
  ].join("")
  return { subject: input.subject, text, html }
}

export function readStoredDocumentRequest(log: {
  id: string
  adminEmail: string
  details: string | null
  createdAt: Date | string
}): StoredDocumentRequest | null {
  if (!log.id || !log.details?.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(log.details) as unknown
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const row = parsed as Record<string, unknown>
  const message = typeof row.message === "string" ? row.message.trim() : ""
  if (!message) return null
  const date = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt)
  if (Number.isNaN(date.getTime())) return null
  const assuranceLabel =
    typeof row.assuranceLabel === "string" && row.assuranceLabel.trim()
      ? row.assuranceLabel.trim()
      : "Dossier client"
  const sentTo = typeof row.sentTo === "string" ? row.sentTo.trim() : ""
  return {
    id: log.id,
    message,
    assuranceLabel,
    sentTo,
    adminEmail: log.adminEmail,
    createdAt: date.toISOString(),
  }
}

export function documentRequestActivityLabel(details?: string | null): string {
  const base = "Demande de document envoyée"
  if (!details?.trim()) return base
  const read = readStoredDocumentRequest({
    id: "preview",
    adminEmail: "admin",
    details,
    createdAt: "2026-01-01T00:00:00.000Z",
  })
  if (!read) return base
  const flat = read.message.replace(/\s+/g, " ").trim()
  const excerpt = flat.length > 80 ? `${flat.slice(0, 77)}…` : flat
  const where = read.assuranceLabel !== "Dossier client" ? ` (${read.assuranceLabel})` : ""
  return `${base}${where} : ${excerpt}`
}
