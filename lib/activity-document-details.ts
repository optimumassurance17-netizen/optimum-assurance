import { ACTIVITE_CATALOGUE } from "@/lib/decennale-activites-catalogue"
import {
  ACTIVITE_EXCLUSIONS,
  ACTIVITE_TO_NOMENCLATURE,
  type NomenclatureItem,
} from "@/lib/nomenclature-activites"

export type ActivityDocumentDetail = {
  key: string
  activityLabel: string
  code?: string
  definition: string
  exclusions: string[]
}

type CanonicalActivityByCode = {
  code: string
  officialLabel: string
  relatedSiteActivities: string[]
  exclusions: string[]
}

const CODE_DEFINITIONS: Record<string, string> = {
  "1.1":
    "Démolition ou déconstruction totale ou partielle d'ouvrages par moyens manuels ou mécaniques (hors désamiantage).",
  "1.2":
    "Démolition ou déconstruction totale ou partielle d'ouvrages avec utilisation d'explosifs (hors désamiantage).",
  "1.3":
    "Travaux de terrassement : déblai, fouilles, remblaiement, enrochement non lié et gabions (hors comblement des carrières).",
  "1.6":
    "Réalisation de voiries et réseaux divers (VRD), canalisations, assainissement autonome et aménagements extérieurs associés.",
  "1.11":
    "Traitement des murs contre les remontées d'humidité par capillarité, avec travaux préparatoires et parements associés.",
  "2.1":
    "Réalisation de fondations et parois spéciales, y compris pieux, micropieux, barrettes, palplanches et reprises en sous-œuvre.",
  "2.2":
    "Maçonnerie et béton armé en infrastructure et superstructure, hors parois de soutènement structurellement autonomes > 2,5 m.",
  "2.3": "Mise en œuvre de béton armé précontraint mis en tension sur chantier.",
  "2.4": "Réalisation de charpentes et structures à base de bois (hors façades-rideaux).",
  "2.5":
    "Constructions à ossature bois, hors fondations, structures maçonnées et étanchéité des toitures-terrasses.",
  "2.6": "Réalisation de charpentes et structures métalliques (hors façades-rideaux).",
  "3.1":
    "Réalisation de couvertures en tous matériaux, y compris zinguerie et accessoires, hors couvertures textiles et étanchéité de toitures-terrasses.",
  "3.2":
    "Étanchéité de toiture, terrasse et plancher intérieur par matériaux bitumineux ou de synthèse.",
  "3.3":
    "Étanchéité et imperméabilisation de cuvelages, réservoirs et piscines en béton armé ou précontraint.",
  "3.4":
    "Revêtements de façades par enduits, ravalements et protections d'imperméabilité/étanchéité de façade.",
  "3.5": "Isolation thermique par l'extérieur (ITE) avec enduit ou parement collé.",
  "3.6": "Réalisation de bardages de façade (hors façades-rideaux, semi-rideaux et panneaux).",
  "3.7":
    "Réalisation de façades-rideaux, façades-semi-rideaux et façades-panneaux, avec éléments de remplissage.",
  "3.9":
    "Menuiseries extérieures en tous matériaux (hors verrières, vérandas et façades-rideaux).",
  "3.10":
    "Réalisation de verrières et vérandas en tous matériaux (hors fondations et structures maçonnées).",
  "4.1": "Menuiseries intérieures et aménagements associés (hors éléments structurels ou porteurs).",
  "4.4":
    "Plâtrerie, staff, stuc et gypserie : cloisonnement et faux plafonds en intérieur.",
  "4.5": "Serrurerie et métallerie (hors charpentes métalliques et vérandas).",
  "4.6":
    "Vitrerie et miroiterie, hors techniques de vitrage extérieur collé (VEC) ou attaché (VEA).",
  "4.7":
    "Travaux de peinture et revêtements associés, hors imperméabilisation, étanchéité et sols coulés.",
  "4.8":
    "Revêtements intérieurs en matériaux souples et parquets, hors sols coulés.",
  "4.9":
    "Revêtement de surfaces en matériaux durs, chapes et sols coulés, hors étanchéité sous carrelage de toiture-terrasse/piscine/cuvelage.",
  "4.10":
    "Revêtement vertical en matériaux durs agrafés ou attachés, avec travaux associés d'isolation par l'extérieur.",
  "4.11": "Isolation intérieure thermique et acoustique.",
  "4.12": "Isolation frigorifique des locaux, circuits et équipements.",
  "5.1":
    "Plomberie : installation de production/distribution/évacuation d'eau et réseaux associés (hors production de chauffage, géothermie et capteurs solaires intégrés).",
  "5.2":
    "Chauffages et installations thermiques, incluant production/distribution de chauffage et eau chaude sanitaire.",
  "5.4":
    "Installations d'aéraulique, climatisation et conditionnement d'air (production, distribution, évacuation).",
  "5.5":
    "Électricité et télécommunications : réseaux de courant, raccordements et installations électriques du bâtiment.",
  "5.6":
    "Réalisation d'ascenseurs, monte-charge, monte-personne, escaliers mécaniques et trottoirs roulants.",
  "5.7": "Réalisation de piscines et de leurs organes/équipements.",
  "5.8":
    "Installations de chauffage/rafraîchissement/eau chaude sanitaire par géothermie, y compris captage.",
  "5.9":
    "Installations photovoltaïques, branchements électriques associés et raccordement réseau.",
  "5.10": "Installations éoliennes terrestres et équipements associés.",
  "5.11": "Construction de fours et cheminées industriels.",
  "PI-ARCH":
    "Mission de maîtrise d'œuvre de conception et/ou de direction d'exécution des travaux pour opérations de construction.",
  "PI-ARCH-INT":
    "Mission complète ou partielle de conception et/ou direction d'exécution pour aménagement intérieur et agencement, sans intervention sur la structure.",
  "PI-MOE":
    "Maîtrise d'œuvre de conception et de réalisation, avec coordination technique de l'opération.",
  "PI-ECON":
    "Missions d'économiste de la construction : métré, estimation, suivi économique et participation au CCTP.",
  "PI-METRE":
    "Missions de métré et vérification quantitative des travaux.",
  "PI-SPS":
    "Coordination sécurité et protection de la santé sur opération de bâtiment.",
  "PI-DIAG":
    "Diagnostics techniques réglementaires du bâtiment selon périmètre missionné.",
  "PI-GEO":
    "Missions de géomètre-topographe : relevés métriques et établissement de plans.",
  "PI-BET-STR":
    "Bureau d'études techniques structure : conception, notes de calcul, plans d'exécution structurels.",
  "PI-BET-FLU":
    "Bureau d'études techniques fluides : CVC, plomberie, électricité et génie climatique.",
  "PI-BET":
    "Bureau d'études techniques tous corps d'état : études de conception et vérifications de conformité.",
}

const ACTIVITY_DETAILS_FALLBACK_EXCLUSION =
  "Aucune exclusion spécifique supplémentaire (hors exclusions légales et clauses générales)."

const CODE_PATTERN = /^((?:\d+(?:\.\d+){0,2})|(?:PI(?:-[A-Z0-9]+){0,4}))\b/i

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function splitCodeAndName(raw: string): { code?: string; name: string } {
  const clean = raw.trim()
  if (!clean) return { name: "" }
  const match = clean.match(CODE_PATTERN)
  if (!match) return { name: clean }
  const code = match[1].toUpperCase()
  const remaining = clean.slice(match[0].length).replace(/^[-:\s]+/, "").trim()
  return { code, name: remaining || clean }
}

function isHierarchyGroupLine(activityLine: string, code?: string): boolean {
  if (!code) return false
  if (!/^\d+$/.test(code)) return false
  return /\d+\s*-\s*/.test(activityLine)
}

function compareCode(a: string, b: string): number {
  const aParts = a
    .split(".")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
  const bParts = b
    .split(".")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
  if (aParts.length > 0 && bParts.length > 0) {
    const max = Math.max(aParts.length, bParts.length)
    for (let i = 0; i < max; i += 1) {
      const av = aParts[i] ?? -1
      const bv = bParts[i] ?? -1
      if (av !== bv) return av - bv
    }
    return a.localeCompare(b, "fr")
  }
  if (aParts.length > 0) return -1
  if (bParts.length > 0) return 1
  return a.localeCompare(b, "fr")
}

function buildCanonicalByCode(): Map<string, CanonicalActivityByCode> {
  const byCode = new Map<string, CanonicalActivityByCode>()
  for (const [siteActivity, mappings] of Object.entries(ACTIVITE_TO_NOMENCLATURE)) {
    const exclusions = ACTIVITE_EXCLUSIONS[siteActivity] ?? []
    for (const mapping of mappings) {
      const existing = byCode.get(mapping.code) ?? {
        code: mapping.code,
        officialLabel: mapping.libelleOfficiel,
        relatedSiteActivities: [],
        exclusions: [],
      }
      if (!existing.relatedSiteActivities.includes(siteActivity)) {
        existing.relatedSiteActivities.push(siteActivity)
      }
      for (const exclusion of exclusions) {
        if (!existing.exclusions.includes(exclusion)) {
          existing.exclusions.push(exclusion)
        }
      }
      byCode.set(mapping.code, existing)
    }
  }

  for (const item of byCode.values()) {
    item.relatedSiteActivities.sort((a, b) => a.localeCompare(b, "fr"))
    item.exclusions.sort((a, b) => a.localeCompare(b, "fr"))
  }
  return byCode
}

function buildSiteActivityIndex(): Map<string, string> {
  const index = new Map<string, string>()
  for (const siteActivity of Object.keys(ACTIVITE_TO_NOMENCLATURE)) {
    index.set(normalizeText(siteActivity), siteActivity)
  }
  return index
}

const canonicalByCode = buildCanonicalByCode()
const siteActivityIndex = buildSiteActivityIndex()
const siteActivityKeysSorted = [...Object.keys(ACTIVITE_TO_NOMENCLATURE)].sort(
  (a, b) => b.length - a.length
)

function buildDefinitionFromMapping(code: string, libelleOfficiel: string): string {
  return (
    CODE_DEFINITIONS[code] ??
    `Travaux relevant du code ${code} (${libelleOfficiel}) selon la nomenclature France Assureurs 2019.`
  )
}

function findSiteActivityFromText(value: string): string | undefined {
  const normalized = normalizeText(value)
  const exact = siteActivityIndex.get(normalized)
  if (exact) return exact
  for (const key of siteActivityKeysSorted) {
    const normalizedKey = normalizeText(key)
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return key
    }
  }
  return undefined
}

function mapFromNomenclatureItem(
  item: NomenclatureItem,
  siteActivity: string,
  activityLabel: string
): ActivityDocumentDetail {
  const exclusions = ACTIVITE_EXCLUSIONS[siteActivity] ?? []
  return {
    key: `${item.code}:${normalizeText(activityLabel)}`,
    activityLabel,
    code: item.code,
    definition: buildDefinitionFromMapping(item.code, item.libelleOfficiel),
    exclusions:
      exclusions.length > 0 ? exclusions : [ACTIVITY_DETAILS_FALLBACK_EXCLUSION],
  }
}

function detailFromCatalogue(activityLabel: string): ActivityDocumentDetail | null {
  const fiche = ACTIVITE_CATALOGUE[activityLabel]
  if (!fiche) return null
  return {
    key: `catalogue:${normalizeText(activityLabel)}`,
    activityLabel,
    definition: fiche.description,
    exclusions:
      fiche.exclusions.length > 0 ? fiche.exclusions : [ACTIVITY_DETAILS_FALLBACK_EXCLUSION],
  }
}

function resolveActivityDetail(rawLine: string): ActivityDocumentDetail | null {
  const activityLabel = rawLine.trim()
  if (!activityLabel) return null

  const fromCatalogue = detailFromCatalogue(activityLabel)
  if (fromCatalogue) return fromCatalogue

  const { code, name } = splitCodeAndName(activityLabel)
  const fromNamedCatalogue = detailFromCatalogue(name)
  if (fromNamedCatalogue) {
    return { ...fromNamedCatalogue, activityLabel, key: `catalogue:${normalizeText(activityLabel)}` }
  }

  if (isHierarchyGroupLine(activityLabel, code)) {
    return null
  }

  if (code) {
    const byCode = canonicalByCode.get(code)
    if (byCode) {
      return {
        key: `${byCode.code}:${normalizeText(activityLabel)}`,
        activityLabel,
        code: byCode.code,
        definition: buildDefinitionFromMapping(byCode.code, byCode.officialLabel),
        exclusions:
          byCode.exclusions.length > 0
            ? byCode.exclusions
            : [ACTIVITY_DETAILS_FALLBACK_EXCLUSION],
      }
    }
  }

  const inferredSiteActivity = findSiteActivityFromText(name || activityLabel)
  if (inferredSiteActivity) {
    const nomenclature = ACTIVITE_TO_NOMENCLATURE[inferredSiteActivity]
    if (nomenclature?.length) {
      return mapFromNomenclatureItem(
        nomenclature[0],
        inferredSiteActivity,
        activityLabel
      )
    }
  }

  return {
    key: normalizeText(activityLabel),
    activityLabel,
    code,
    definition:
      "Activite declaree par l'assure. Definition detaillee non disponible dans la nomenclature mappee.",
    exclusions: [ACTIVITY_DETAILS_FALLBACK_EXCLUSION],
  }
}

export function buildActivityDocumentDetails(
  activities: string[]
): ActivityDocumentDetail[] {
  const rows = activities
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const deduped = new Map<string, ActivityDocumentDetail>()
  for (const row of rows) {
    const detail = resolveActivityDetail(row)
    if (!detail) continue
    const existing = deduped.get(detail.key)
    if (!existing) {
      deduped.set(detail.key, detail)
      continue
    }
    const mergedExclusions = [...existing.exclusions]
    for (const exclusion of detail.exclusions) {
      if (!mergedExclusions.includes(exclusion)) mergedExclusions.push(exclusion)
    }
    deduped.set(detail.key, {
      ...existing,
      exclusions: mergedExclusions,
    })
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.code && b.code) return compareCode(a.code, b.code)
    if (a.code) return -1
    if (b.code) return 1
    return a.activityLabel.localeCompare(b.activityLabel, "fr")
  })
}
