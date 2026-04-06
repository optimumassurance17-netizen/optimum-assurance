/**
 * Données session après lien `/sign/[id]` (anciennes clés `yousign*` encore supportées en lecture).
 */
export function getSignedContractData(raw: Record<string, unknown>): Record<string, unknown> | null {
  const signed = raw.signedContractData
  const legacy = raw.yousignContractData
  if (signed && typeof signed === "object" && !Array.isArray(signed)) {
    return signed as Record<string, unknown>
  }
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    return legacy as Record<string, unknown>
  }
  return null
}

export function getSignedContractNumero(raw: Record<string, unknown>): string | undefined {
  const n = raw.signedContractNumero ?? raw.yousignContractNumero
  return typeof n === "string" && n.trim() ? n : undefined
}
