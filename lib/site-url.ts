/**
 * URL publique canonique du site (sans slash final).
 * Utilisée pour SEO (metadata, robots, sitemap, JSON-LD), emails et liens absolus.
 *
 * Ordre de priorité :
 * 1. NEXT_PUBLIC_SITE_CANONICAL — si défini, utilisé tel quel (ex. https://www.optimum-assurance.fr)
 * 2. NEXT_PUBLIC_APP_URL ou BASE_URL — sauf si c’est un domaine *.vercel.app (remplacé par le fallback)
 * 3. Fallback production : https://www.optimum-assurance.fr
 */
const FALLBACK_CANONICAL = "https://www.optimum-assurance.fr"

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_CANONICAL?.trim().replace(/\/$/, "")
  if (explicit) return explicit

  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "")
    .trim()
    .replace(/\/$/, "")
  if (!raw) return FALLBACK_CANONICAL
  if (raw.includes(".vercel.app")) return FALLBACK_CANONICAL
  return raw
}

/** URL canonique (évaluée au chargement du module — build / runtime serveur). */
export const SITE_URL = resolveSiteUrl()

/** Recalcul explicite (tests ou scripts). */
export function getSiteUrl(): string {
  return resolveSiteUrl()
}
