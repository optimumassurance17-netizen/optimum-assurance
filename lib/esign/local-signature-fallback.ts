/**
 * Signature locale, sans Supabase.
 * Le PDF non signé reste dans PendingSignature.contractData (TEXT), sans migration.
 * Le PDF signé est recopié dans le contrat ou dans une pièce d'archive, puis retiré de toute réponse JSON.
 */

export const LOCAL_SIGNATURE_PROVIDER = "local" as const
export const FALLBACK_PDF_KEY = "fallbackPdfBase64" as const
export const LOCAL_SIGNED_PDF_KEY = "localSignedPdfBase64" as const
/** Pièce d'archive du PDF signé personnalisé. Elle ne s'affiche pas dans les listes client. */
export const LOCAL_SIGNED_DOCUMENT_TYPE = "signature_locale" as const
export const LOCAL_DOCUMENT_KEY_PREFIX = "local-document:" as const

/** PDF brut maximal. Reste sous la limite de réponse serveur (environ 4,5 Mo). */
export const MAX_LOCAL_SIGNATURE_PDF_BYTES = 3 * 1024 * 1024

export function signaturePdfTooLargeMessage(): string {
  const mega = MAX_LOCAL_SIGNATURE_PDF_BYTES / (1024 * 1024)
  return `PDF trop volumineux pour la signature (max. ${mega} Mo).`
}
/** Le PDF signé peut grossir un peu après l'apposition de l'image. */
export const MAX_LOCAL_SIGNED_PDF_BYTES = 4 * 1024 * 1024

const CONNECTIVITY_RE =
  /injoignable|ne répond pas|ne repond pas|fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|getaddrinfo|UND_ERR_CONNECT|UND_ERR_SOCKET|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|UND_ERR_CONNECT_TIMEOUT|AbortError|aborted|timeout/i

const SECRET_RE = /bearer\s+\S+|eyJ[\w.-]+|sb_secret_\S+|service_role/gi

function collectErrorTexts(error: unknown, depth = 0): string[] {
  if (!error || depth > 5) return []
  const parts: string[] = []
  if (typeof error === "string") parts.push(error)
  if (error instanceof Error && error.message) parts.push(error.message)
  if (typeof error === "object") {
    const record = error as Record<string, unknown>
    if (typeof record.code === "string") parts.push(record.code)
    if (typeof record.message === "string" && !(error instanceof Error)) parts.push(record.message)
    parts.push(...collectErrorTexts(record.cause, depth + 1))
    parts.push(...collectErrorTexts(record.originalError, depth + 1))
  }
  return parts
}

/** Erreur réseau / DNS / projet Supabase injoignable. Les erreurs métier restent des échecs. */
export function isSupabaseConnectivityError(error: unknown): boolean {
  return collectErrorTexts(error).some((part) => CONNECTIVITY_RE.test(part))
}

export function safeLogMessage(error: unknown): string {
  const message = collectErrorTexts(error).join(" — ") || "erreur"
  return message.replace(SECRET_RE, "[secret]").replace(/[A-Za-z0-9+/=]{80,}/g, "[blob]").slice(0, 180)
}

export function readContractObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function hasStoredFallbackPdf(data: Record<string, unknown> | null): boolean {
  if (!data || data.signatureProvider !== LOCAL_SIGNATURE_PROVIDER) return false
  const pdf = data[FALLBACK_PDF_KEY]
  return typeof pdf === "string" && pdf.length > 80
}

export function isLocalFallbackContract(data: Record<string, unknown> | null): boolean {
  if (!data || data.customUploadedDevisFlow === true) return false
  return hasStoredFallbackPdf(data)
}

/** Devis PDF personnalisé signé localement : le fichier est dans le dossier, pas dans Supabase. */
export function isLocalCustomPdfContract(data: Record<string, unknown> | null): boolean {
  if (!data || data.customUploadedDevisFlow !== true) return false
  return hasStoredFallbackPdf(data)
}

export function isLocalSignableContract(data: Record<string, unknown> | null): boolean {
  return isLocalFallbackContract(data) || isLocalCustomPdfContract(data)
}

function declaredActivityCount(data: Record<string, unknown>): number {
  if (Array.isArray(data.activites)) {
    return data.activites.filter((item) => typeof item === "string" && item.trim().length > 0).length
  }
  if (typeof data.activites === "string") {
    return data.activites
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length
  }
  return 0
}

/**
 * Contrat décennale dont le PDF peut être régénéré si Supabase ne renvoie pas l'original.
 * Le devis PDF personnalisé n'est pas concerné : son fichier n'existe que dans le stockage.
 */
export function isRebuildableDecennaleContract(data: Record<string, unknown> | null): boolean {
  if (!data || isLocalFallbackContract(data)) return false
  if (data.customUploadedDevisFlow === true) return false
  const raisonSociale = typeof data.raisonSociale === "string" ? data.raisonSociale.trim() : ""
  const dateEffet = typeof data.dateEffet === "string" ? data.dateEffet.trim() : ""
  const dateEcheance = typeof data.dateEcheance === "string" ? data.dateEcheance.trim() : ""
  const prime = Number(data.primeAnnuelle)
  return Boolean(
    raisonSociale && dateEffet && dateEcheance && declaredActivityCount(data) > 0 && Number.isFinite(prime) && prime > 0
  )
}

export function decodeStoredPdfBase64(
  value: unknown,
  maxBytes = MAX_LOCAL_SIGNATURE_PDF_BYTES
): Uint8Array | null {
  if (typeof value !== "string") return null
  const compact = value.replace(/\s/g, "")
  if (compact.length < 80 || compact.length > Math.ceil(maxBytes * 1.4)) return null
  const bytes = Buffer.from(compact, "base64")
  if (bytes.length < 5 || bytes.length > maxBytes) return null
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return null
  return new Uint8Array(bytes)
}

export function stripSignatureBinaries<T extends Record<string, unknown>>(data: T): T {
  if (!(FALLBACK_PDF_KEY in data) && !(LOCAL_SIGNED_PDF_KEY in data)) return data
  const copy = { ...data }
  delete copy[FALLBACK_PDF_KEY]
  delete copy[LOCAL_SIGNED_PDF_KEY]
  return copy
}

export function stripSignatureBinariesFromJsonString(raw: string): string {
  if (!raw.includes(FALLBACK_PDF_KEY) && !raw.includes(LOCAL_SIGNED_PDF_KEY)) return raw
  const parsed = readContractObject(raw)
  if (!parsed) return raw
  return JSON.stringify(stripSignatureBinaries(parsed))
}
