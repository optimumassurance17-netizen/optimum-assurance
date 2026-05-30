export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function normalizeProductType(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

/**
 * Détecte le produit d'un document contrat (quand l'info est présente).
 * Legacy: si absent, on retourne chaîne vide (considéré décennale-compatible).
 */
export function getContractProductType(data: Record<string, unknown>): string {
  const explicit =
    normalizeProductType(data.insuranceProduct) || normalizeProductType(data.productType)
  if (explicit) return explicit

  const fallbackType = normalizeProductType(data.type)
  if (fallbackType === "do" || fallbackType === "dommage-ouvrage" || fallbackType === "dommage_ouvrage") {
    return "do"
  }
  return fallbackType
}

/**
 * Un contrat est considéré décennale s'il n'est pas explicitement DO/RC fabriquant.
 * Cela préserve les contrats legacy sans champ produit explicite.
 */
export function isDecennaleContractData(data: Record<string, unknown>): boolean {
  const productType = getContractProductType(data)
  if (!productType) return true
  if (productType === "do" || productType === "dommage-ouvrage" || productType === "dommage_ouvrage") {
    return false
  }
  if (
    productType === "rc_fabriquant" ||
    productType === "rc-fabriquant" ||
    productType === "rcfabriquant"
  ) {
    return false
  }
  return true
}
