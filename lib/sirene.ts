/**
 * Client API Sirene - INSEE (gratuit) ou Pappers (payant)
 * Priorité : INSEE si configuré, sinon Pappers
 */

const INSEE_BASE = "https://api.insee.fr/api-sirene/3.11"

export type SireneResult = {
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  /** Date de création de l'unité légale (format AAAA-MM-JJ) - pour attestation non sinistralité */
  dateCreationSociete?: string
}

/** Normalise une valeur en string, retourne une string vide si null/undefined */
function safeString(value: unknown): string {
  return String(value || "").trim()
}

/** Récupère un token OAuth2 depuis consumer key + secret (INSEE) */
async function getInseeToken(): Promise<string | null> {
  const key = process.env.INSEE_CONSUMER_KEY
  const secret = process.env.INSEE_CONSUMER_SECRET
  if (!key || !secret) return null

  try {
    const res = await fetch("https://api.insee.fr/connexion/oauth2/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: key,
        client_secret: secret,
      }),
    })

    if (!res.ok) return null
    const data = (await res.json()) as { access_token?: string }
    return data.access_token || null
  } catch {
    return null
  }
}

/** Construit les headers d'authentification pour l'API INSEE */
function buildInseeHeaders(): Record<string, string> | null {
  const headers: Record<string, string> = { Accept: "application/json" }

  // Option 1 : Header X-INSEE-Api-Key-Integration (portail api.insee.fr)
  const integrationKey = process.env.INSEE_API_KEY_INTEGRATION
  if (integrationKey) {
    headers["X-INSEE-Api-Key-Integration"] = integrationKey
    return headers
  }

  // Option 2 : Token Bearer (INSEE_SIRENE_API_KEY ou OAuth2)
  const directKey = process.env.INSEE_SIRENE_API_KEY
  if (directKey) {
    headers.Authorization = directKey.startsWith("Bearer ") ? directKey : `Bearer ${directKey}`
    return headers
  }

  return null
}

/** Recherche par SIRET via API Sirene INSEE */
export async function fetchSireneInsee(siret: string): Promise<SireneResult | null> {
  let headers = buildInseeHeaders()
  
  // Si pas de header direct, essayer OAuth2
  if (!headers) {
    const token = await getInseeToken()
    if (!token) return null
    headers = { Accept: "application/json", Authorization: `Bearer ${token}` }
  }

  try {
    const res = await fetch(`${INSEE_BASE}/siret/${siret}`, { headers })
    if (!res.ok) return null
    return parseInseeResponse(await res.json())
  } catch {
    return null
  }
}

function parseInseeResponse(data: Record<string, unknown>): SireneResult | null {
  const etab = data.etablissement as Record<string, unknown> | undefined
  if (!etab) return null

  const ul =
    (etab.uniteLegale as Record<string, unknown>) ||
    (data.uniteLegale as Record<string, unknown>)

  // Construire l'adresse à partir de l'objet adresseEtablissement
  const adresseObj = etab.adresseEtablissement as Record<string, unknown> | undefined
  const adresseParts: string[] = []
  
  if (adresseObj) {
    const fields = [
      adresseObj.numeroVoieEtablissement,
      adresseObj.typeVoieEtablissement,
      adresseObj.libelleVoieEtablissement,
    ]
    adresseParts.push(...fields.filter(Boolean).map(String))
  }
  
  const adresse = adresseParts.join(" ").trim()
  const codePostal = safeString(
    etab.codePostalEtablissement || adresseObj?.codePostalEtablissement
  )
  const ville = safeString(
    etab.libelleCommuneEtablissement || adresseObj?.libelleCommuneEtablissement
  )

  // Construire la raison sociale
  const raisonSociale =
    safeString(ul?.denominationUniteLegale) ||
    safeString(ul?.nomUsageUniteLegale) ||
    [
      ul?.prenomUsuelUniteLegale,
      ul?.nomUsageUniteLegale,
    ]
      .filter(Boolean)
      .map(String)
      .join(" ")
      .trim() ||
    ""

  // dateCreationUniteLegale : format AAAA-MM-JJ
  const dateCreationSociete = safeString(ul?.dateCreationUniteLegale) || undefined

  return {
    raisonSociale,
    adresse,
    codePostal,
    ville,
    ...(dateCreationSociete && { dateCreationSociete }),
  }
}

/** Recherche par SIRET via Pappers */
export async function fetchSirenePappers(siret: string): Promise<SireneResult | null> {
  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.pappers.fr/v2/entreprise?siret=${siret}&api_token=${apiKey}`,
      { headers: { Accept: "application/json" } }
    )

    if (!res.ok) return null

    const data = (await res.json()) as {
      nom_entreprise?: string
      siege?: { adresse?: string; code_postal?: string; ville?: string }
      date_creation?: string
    }

    const dateCreationSociete = safeString(data.date_creation) || undefined

    return {
      raisonSociale: safeString(data.nom_entreprise),
      adresse: safeString(data.siege?.adresse),
      codePostal: safeString(data.siege?.code_postal),
      ville: safeString(data.siege?.ville),
      ...(dateCreationSociete && { dateCreationSociete }),
    }
  } catch {
    return null
  }
}

/** Vérifie si l'API INSEE est configurée */
function hasInseeConfig(): boolean {
  return !!(
    process.env.INSEE_SIRENE_API_KEY ||
    process.env.INSEE_API_KEY_INTEGRATION ||
    (process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET)
  )
}

/** Pour health / monitoring : présence des clés (aucun appel réseau). */
export function getSireneEnvStatus(): {
  insee: "configured" | "missing"
  pappers: "configured" | "missing"
} {
  return {
    insee: hasInseeConfig() ? "configured" : "missing",
    pappers: process.env.PAPPERS_API_KEY?.trim() ? "configured" : "missing",
  }
}

/** Recherche entreprise par SIRET - INSEE en priorité, puis Pappers */
export async function fetchEntrepriseBySiret(siret: string): Promise<SireneResult | null> {
  const normalized = siret.replace(/\s/g, "")
  if (normalized.length !== 14 || !/^\d+$/.test(normalized)) return null

  // Essayer INSEE en premier si configuré
  if (hasInseeConfig()) {
    const result = await fetchSireneInsee(normalized)
    if (result) return result
  }

  // Fallback sur Pappers si configuré
  if (process.env.PAPPERS_API_KEY) {
    return fetchSirenePappers(normalized)
  }

  return null
}