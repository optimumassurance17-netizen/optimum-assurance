/** Champs qu'un administrateur peut corriger sur un contrat dommage ouvrage ou décennale. */

export function isEditablePlatformContractProduct(productType: string): boolean {
  return productType === "do" || productType === "decennale"
}

export function activitiesLabelFromJson(activitiesJson: string | null | undefined): string {
  if (!activitiesJson?.trim()) return ""
  try {
    const parsed = JSON.parse(activitiesJson) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ")
    }
  } catch {
    return activitiesJson.trim()
  }
  return ""
}

export function activitiesJsonFromInput(value: unknown): string | null {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null
  if (!items) return null
  const activities = items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
  return activities.length > 0 ? JSON.stringify(activities) : null
}

export type PlatformContractIdentityPatch = {
  clientName: string
  siret: string | null
  address: string
  activitiesJson: string | null
  projectName?: string | null
  projectAddress?: string | null
  constructionNature?: string | null
}

export function readPlatformContractIdentityPatch(
  productType: string,
  payload: Record<string, unknown>
): { ok: true; patch: PlatformContractIdentityPatch } | { ok: false; error: string; status: number } {
  if (!isEditablePlatformContractProduct(productType)) {
    return {
      ok: false,
      status: 409,
      error: "Seuls le dommage ouvrage et la décennale se modifient ici.",
    }
  }
  const clientName = typeof payload.clientName === "string" ? payload.clientName.trim() : ""
  const address = typeof payload.address === "string" ? payload.address.trim() : ""
  if (!clientName) return { ok: false, status: 400, error: "Le nom du client est requis." }
  if (!address) return { ok: false, status: 400, error: "L'adresse est requise." }
  if ("activities" in payload && payload.activities != null && typeof payload.activities !== "string" && !Array.isArray(payload.activities)) {
    return { ok: false, status: 400, error: "Activités invalides." }
  }
  const siret = typeof payload.siret === "string" ? payload.siret.replace(/\s/g, "").trim() : ""
  const patch: PlatformContractIdentityPatch = {
    clientName,
    siret: siret || null,
    address,
    activitiesJson: activitiesJsonFromInput(payload.activities),
  }
  if (productType === "do") {
    patch.projectName = typeof payload.projectName === "string" && payload.projectName.trim() ? payload.projectName.trim() : null
    patch.projectAddress =
      typeof payload.projectAddress === "string" && payload.projectAddress.trim() ? payload.projectAddress.trim() : null
    patch.constructionNature =
      typeof payload.constructionNature === "string" && payload.constructionNature.trim()
        ? payload.constructionNature.trim()
        : null
  }
  return { ok: true, patch }
}

const IDENTITY_KEYS = [
  "clientName",
  "siret",
  "address",
  "activities",
  "projectName",
  "projectAddress",
  "constructionNature",
] as const

export function payloadTouchesPlatformContractIdentity(payload: Record<string, unknown>): boolean {
  return IDENTITY_KEYS.some((key) => key in payload)
}
