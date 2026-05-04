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
    "Demolition ou deconstruction totale ou partielle d'ouvrages par moyens manuels ou mecaniques (hors desamiantage).",
  "1.2":
    "Demolition ou deconstruction totale ou partielle d'ouvrages avec utilisation d'explosifs (hors desamiantage).",
  "1.3":
    "Travaux de terrassement : deblai, fouilles, remblaiement, enrochement non lie et gabions (hors comblement des carrieres).",
  "1.6":
    "Realisation de voiries et reseaux divers (VRD), canalisations, assainissement autonome et amenagements exterieurs associes.",
  "1.11":
    "Traitement des murs contre les remontees d'humidite par capillarite, avec travaux preparatoires et parements associes.",
  "2.1":
    "Realisation de fondations et parois speciales, y compris pieux, micropieux, barrettes, palplanches et reprises en sous-oeuvre.",
  "2.2":
    "Maconnerie et beton arme en infrastructure et superstructure, hors parois de soutenement structurellement autonomes > 2,5 m.",
  "2.3": "Mise en oeuvre de beton arme precontraint mis en tension sur chantier.",
  "2.4": "Realisation de charpentes et structures a base de bois (hors facades-rideaux).",
  "2.5":
    "Constructions a ossature bois, hors fondations, structures maconnees et etancheite des toitures-terrasses.",
  "2.6": "Realisation de charpentes et structures metalliques (hors facades-rideaux).",
  "3.1":
    "Realisation de couvertures en tous materiaux, y compris zinguerie et accessoires, hors couvertures textiles et etancheite de toitures-terrasses.",
  "3.2":
    "Etancheite de toiture, terrasse et plancher interieur par materiaux bitumineux ou de synthese.",
  "3.3":
    "Etancheite et impermeabilisation de cuvelages, reservoirs et piscines en beton arme ou precontraint.",
  "3.4":
    "Revetements de facades par enduits, ravalements et protections d'impermeabilite/etancheite de facade.",
  "3.5": "Isolation thermique par l'exterieur (ITE) avec enduit ou parement colle.",
  "3.6": "Realisation de bardages de facade (hors facades-rideaux, semi-rideaux et panneaux).",
  "3.7":
    "Realisation de facades-rideaux, facades-semi-rideaux et facades-panneaux, avec elements de remplissage.",
  "3.9":
    "Menuiseries exterieures en tous materiaux (hors verrieres, verandas et facades-rideaux).",
  "3.10":
    "Realisation de verrieres et verandas en tous materiaux (hors fondations et structures maconnees).",
  "4.1": "Menuiseries interieures et amenagements associes (hors elements structurels ou porteurs).",
  "4.4":
    "Platrerie, staff, stuc et gypserie : cloisonnement et faux plafonds en interieur.",
  "4.5": "Serrurerie et metallerie (hors charpentes metalliques et verandas).",
  "4.6":
    "Vitrerie et miroiterie, hors techniques de vitrage exterieur colle (VEC) ou attache (VEA).",
  "4.7":
    "Travaux de peinture et revetements associes, hors impermeabilisation, etancheite et sols coules.",
  "4.8":
    "Revetements interieurs en materiaux souples et parquets, hors sols coules.",
  "4.9":
    "Revetement de surfaces en materiaux durs, chapes et sols coules, hors etancheite sous carrelage de toiture-terrasse/piscine/cuvelage.",
  "4.10":
    "Revetement vertical en materiaux durs agrafes ou attaches, avec travaux associes d'isolation par l'exterieur.",
  "4.11": "Isolation interieure thermique et acoustique.",
  "4.12": "Isolation frigorifique des locaux, circuits et equipements.",
  "5.1":
    "Plomberie : installation de production/distribution/evacuation d'eau et reseaux associes (hors production de chauffage, geothermie et capteurs solaires integres).",
  "5.2":
    "Chauffages et installations thermiques, incluant production/distribution de chauffage et eau chaude sanitaire.",
  "5.4":
    "Installations d'aeraulique, climatisation et conditionnement d'air (production, distribution, evacuation).",
  "5.5":
    "Electricite et telecommunications : reseaux de courant, raccordements et installations electriques du batiment.",
  "5.6":
    "Realisation d'ascenseurs, monte-charge, monte-personne, escaliers mecaniques et trottoirs roulants.",
  "5.7": "Realisation de piscines et de leurs organes/equipements.",
  "5.8":
    "Installations de chauffage/rafraichissement/eau chaude sanitaire par geothermie, y compris captage.",
  "5.9":
    "Installations photovoltaiques, branchements electriques associes et raccordement reseau.",
  "5.10": "Installations eoliennes terrestres et equipements associes.",
  "5.11": "Construction de fours et cheminees industriels.",
  "PI-ARCH":
    "Mission de maitrise d'oeuvre de conception et/ou de direction d'execution des travaux pour operations de construction.",
  "PI-ARCH-INT":
    "Mission complete ou partielle de conception et/ou direction d'execution pour amenagement interieur et agencement, sans intervention sur la structure.",
  "PI-MOE":
    "Maitrise d'oeuvre de conception et de realisation, avec coordination technique de l'operation.",
  "PI-ECON":
    "Missions d'economiste de la construction : metrage, estimation, suivi economique et participation au CCTP.",
  "PI-METRE":
    "Missions de metrage et verification quantitative des travaux.",
  "PI-SPS":
    "Coordination securite et protection de la sante sur operation de batiment.",
  "PI-DIAG":
    "Diagnostics techniques reglementaires du batiment selon perimetre missionne.",
  "PI-GEO":
    "Missions de geometre-topographe : releves metriques et etablissements de plans.",
  "PI-BET-STR":
    "Bureau d'etudes techniques structure : conception, notes de calcul, plans d'execution structurels.",
  "PI-BET-FLU":
    "Bureau d'etudes techniques fluides : CVC, plomberie, electricite et genie climatique.",
  "PI-BET":
    "Bureau d'etudes techniques tous corps d'etat : etudes de conception et verifications de conformite.",
}

const ACTIVITY_DETAILS_FALLBACK_EXCLUSION =
  "Aucune exclusion specifique supplementaire (hors exclusions legales et clauses generales)."

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

function resolveActivityDetail(rawLine: string): ActivityDocumentDetail | null {
  const activityLabel = rawLine.trim()
  if (!activityLabel) return null

  const { code, name } = splitCodeAndName(activityLabel)
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
