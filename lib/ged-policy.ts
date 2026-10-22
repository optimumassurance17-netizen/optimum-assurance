import { UPLOAD_DOC_TYPES } from "@/lib/user-document-types"

/** Taille max acceptée par la GED (PDF ou image). */
export const GED_MAX_FILE_BYTES = 10 * 1024 * 1024

/**
 * Au-delà, le corps de la requête ne passe plus de façon fiable par l'hébergement
 * (plafond d'environ 4,5 Mo). Le fichier part alors directement vers le stockage.
 */
export const GED_INLINE_UPLOAD_MAX_BYTES = 3_500_000

/**
 * Au-delà, la réponse du serveur ne peut plus renvoyer le fichier.
 * L'ouverture passe par un lien signé.
 */
export const GED_PROXY_RESPONSE_MAX_BYTES = 4 * 1024 * 1024

const CLIENT_GED_TYPES = new Set<string>(UPLOAD_DOC_TYPES)
const DEMANDE_GED_TYPE = /^demande_[A-Za-z0-9_-]{8,80}$/

export function canProxyGedBytes(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= GED_PROXY_RESPONSE_MAX_BYTES
}

export function isClientReadableGedType(type: string): boolean {
  return CLIENT_GED_TYPES.has(type) || DEMANDE_GED_TYPE.test(type)
}

export function isOwnedGedObjectPath(userId: string, objectPath: string): boolean {
  const owner = userId.trim()
  if (!owner || owner.includes("/") || owner.includes("\\") || owner.includes("..")) return false
  const normalized = objectPath.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized || normalized.includes("..")) return false
  return normalized.startsWith(`ged/${owner}/`)
}

/** Lien d'ouverture : https, ou http seulement en local. */
export function isSafeGedRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.username || url.password) return false
    if (url.protocol === "https:") return true
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function gedInlineContentDisposition(filename: string): string {
  const cleaned = filename.replace(/[\r\n"]/g, "").trim() || "document"
  const ascii = cleaned
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[^\w.\- ]+/g, "_")
    .trim()
  const fallback = ascii || "document"
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
