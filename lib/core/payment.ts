import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"

export const CORE_PAYMENT_PROVIDER = "mollie" as const

export function getCorePaymentProviderLabel(): string {
  return "Mollie"
}

export function getCorePaymentReturnUrl(path = "/espace-client/rcpro"): string {
  const safePath = path.startsWith("/") ? path : "/espace-client/rcpro"
  return `${getMolliePublicBaseUrl()}${safePath}`
}
