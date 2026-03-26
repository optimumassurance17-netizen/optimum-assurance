/**
 * Base Adresse Nationale (data.gouv) — recherche d'adresses.
 * @see https://adresse.data.gouv.fr/api-doc/adresse
 */

const BAN_SEARCH = "https://api-adresse.data.gouv.fr/search/"

export type AdresseBanSuggestion = {
  /** Libellé complet affiché */
  label: string
  /** Ligne d'adresse (numéro + voie) */
  adresse: string
  codePostal: string
  ville: string
}

type BanFeature = {
  properties?: Record<string, unknown>
}

function propsToSuggestion(properties: Record<string, unknown>): AdresseBanSuggestion | null {
  const postcode = String(properties.postcode ?? "").trim()
  const city = String(properties.city ?? "").trim()
  const housenumber =
    properties.housenumber != null ? String(properties.housenumber).trim() : ""
  const street = String(properties.street ?? properties.name ?? "").trim()
  const label = String(properties.label ?? "").trim()

  let adresse = [housenumber, street].filter(Boolean).join(" ").trim()
  if (!adresse && label) {
    const m = label.match(/^(.+?)\s+(\d{5})\s+(.+)$/)
    if (m) adresse = m[1]!.trim()
  }
  if (!adresse) adresse = label.replace(/\s*\d{5}\s+.+$/, "").trim()

  if (!postcode || !city) return null
  const line =
    adresse && adresse !== "—"
      ? adresse
      : label.replace(/\s*\d{5}\s+.+$/, "").trim() || label
  return {
    label: label || [line, postcode, city].filter(Boolean).join(", "),
    adresse: line,
    codePostal: postcode,
    ville: city,
  }
}

/**
 * Recherche d'adresses (côté serveur uniquement — évite CORS et limite les abus).
 */
export async function searchAdresseBan(query: string): Promise<AdresseBanSuggestion[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url = new URL(BAN_SEARCH)
  url.searchParams.set("q", q)
  url.searchParams.set("limit", "8")

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    console.warn("[adresse-api] BAN HTTP", res.status)
    return []
  }

  const data = (await res.json()) as { features?: BanFeature[] }
  const out: AdresseBanSuggestion[] = []
  for (const f of data.features || []) {
    const p = f.properties
    if (!p || typeof p !== "object") continue
    const s = propsToSuggestion(p as Record<string, unknown>)
    if (s) out.push(s)
  }
  return out
}
