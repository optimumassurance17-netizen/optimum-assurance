export const DEFAULT_PUBLIC_CONTACT_EMAIL = "info@optimum-assurance.eu"
const LEGACY_PUBLIC_EMAIL = "contact@optimum-assurance.fr"

export function normalizePublicContactEmail(value: string | null | undefined): string {
  const email = value?.trim()
  if (!email || email.toLowerCase() === LEGACY_PUBLIC_EMAIL) return DEFAULT_PUBLIC_CONTACT_EMAIL
  return email
}

export function getPublicContactEmail(): string {
  return normalizePublicContactEmail(process.env.NEXT_PUBLIC_EMAIL)
}

export function getContactRecipientEmail(): string {
  return normalizePublicContactEmail(process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_EMAIL)
}
