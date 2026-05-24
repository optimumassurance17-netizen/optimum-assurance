export type ClientIdentity = {
  raisonSociale?: string
  email?: string
  telephone?: string
  siret?: string
  adresse?: string
  codePostal?: string
  ville?: string
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asTrimmedString(source[key])
    if (value) return value
  }
  return undefined
}

function normalizeSiret(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\D/g, "")
  return normalized && normalized.length > 0 ? normalized.slice(0, 14) : undefined
}

function addressFromParts(source: Record<string, unknown>, prefix = ""): string | undefined {
  const address = pickString(source, [
    `${prefix}adresse`,
    `${prefix}address`,
    `${prefix}adresseOperation`,
    `${prefix}adresseConstruction`,
    `${prefix}projectAddress`,
    `${prefix}doProjectAddress`,
  ])
  if (address) return address

  const line = [
    pickString(source, [`${prefix}numeroVoie`, `${prefix}numeroRue`]),
    pickString(source, [`${prefix}typeVoie`]),
    pickString(source, [`${prefix}libelleVoie`, `${prefix}rue`]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
  return line || undefined
}

export function extractClientIdentityFromRecord(source: Record<string, unknown> | null | undefined): ClientIdentity {
  if (!source) return {}

  const adresse =
    addressFromParts(source) ||
    pickString(source, [
      "adresseOperation",
      "adresseConstruction",
      "adresseChantier",
      "projectAddress",
      "doProjectAddress",
      "adresseProjet",
    ])

  return {
    raisonSociale: pickString(source, [
      "raisonSociale",
      "companyName",
      "nomSociete",
      "nomEntreprise",
      "clientName",
      "denomination",
    ]),
    email: pickString(source, ["email", "clientEmail", "toEmail"]),
    telephone: pickString(source, ["telephone", "phone", "tel", "mobile"]),
    siret: normalizeSiret(pickString(source, ["siret", "SIRET"])),
    adresse,
    codePostal: pickString(source, [
      "codePostal",
      "codePostalConstruction",
      "postalCode",
      "projectPostalCode",
      "doProjectPostalCode",
    ]),
    ville: pickString(source, [
      "ville",
      "villeConstruction",
      "city",
      "projectCity",
      "doProjectCity",
      "commune",
    ]),
  }
}

export function mergeClientIdentity(...items: Array<ClientIdentity | null | undefined>): ClientIdentity {
  const out: ClientIdentity = {}
  for (const item of items) {
    if (!item) continue
    for (const key of ["raisonSociale", "email", "telephone", "siret", "adresse", "codePostal", "ville"] as const) {
      if (!out[key] && item[key]) out[key] = item[key]
    }
  }
  return out
}

export function extractClientIdentityFromJson(raw: string | null | undefined): ClientIdentity {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return extractClientIdentityFromRecord(parsed as Record<string, unknown>)
  } catch {
    return {}
  }
}
