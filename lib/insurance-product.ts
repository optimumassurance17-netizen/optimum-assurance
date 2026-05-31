export type InsurancePlatformProductType =
  | "decennale"
  | "do"
  | "rc_fabriquant"
  | "assurance_titre"

export function isInsurancePlatformProductType(
  value: unknown
): value is InsurancePlatformProductType {
  return (
    value === "decennale" ||
    value === "do" ||
    value === "rc_fabriquant" ||
    value === "assurance_titre"
  )
}

export function normalizeInsurancePlatformProductType(
  value: unknown,
  fallback: InsurancePlatformProductType = "decennale"
): InsurancePlatformProductType {
  return isInsurancePlatformProductType(value) ? value : fallback
}

export function getInsuranceProductLabel(productType: unknown): string {
  const normalized = normalizeInsurancePlatformProductType(productType)
  if (normalized === "do") return "Dommages-ouvrage"
  if (normalized === "rc_fabriquant") return "RC Fabriquant"
  if (normalized === "assurance_titre") return "Assurance titre"
  return "Décennale"
}

export function getInsuranceProductLabelLower(productType: unknown): string {
  const normalized = normalizeInsurancePlatformProductType(productType)
  if (normalized === "do") return "assurance dommage ouvrage"
  if (normalized === "rc_fabriquant") return "assurance RC fabriquant"
  if (normalized === "assurance_titre") return "assurance titre"
  return "assurance décennale"
}

export function insuranceProductHasBundledQuotePolicy(productType: unknown): boolean {
  const normalized = normalizeInsurancePlatformProductType(productType)
  return normalized === "decennale" || normalized === "do"
}

export function insuranceProductHasFic(productType: unknown): boolean {
  return normalizeInsurancePlatformProductType(productType) === "rc_fabriquant"
}

export function insuranceProductHasSchedule(productType: unknown): boolean {
  const normalized = normalizeInsurancePlatformProductType(productType)
  return normalized === "decennale" || normalized === "rc_fabriquant"
}

export function insuranceProductAllowsActiveInstallmentPayments(
  productType: unknown
): boolean {
  return normalizeInsurancePlatformProductType(productType) === "rc_fabriquant"
}

export function insuranceProductUsesDirectMollieAfterApproval(
  productType: unknown
): boolean {
  const normalized = normalizeInsurancePlatformProductType(productType)
  return normalized === "do" || normalized === "rc_fabriquant" || normalized === "assurance_titre"
}
