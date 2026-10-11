import {
  RC_FAB_BATTERIES_ACTIVITE,
  RC_FAB_BATTERIES_FRANCHISE_EUR,
  RC_FAB_BATTERIES_PLAFOND_EUR,
  RC_FAB_BATTERIES_PROTECTION_JURIDIQUE_EUR,
  buildRcFabDossierConfig,
  type RcFabDossierConfig,
  type RcFabPeriodicity,
} from "@/lib/rc-fabriquant-dossier-config"
import { RC_TYPE_PRODUIT_OPTIONS } from "@/lib/rc-fabriquant-questionnaire"
import type { DevisRcFabriquantData, RcTypeProduit, RcZoneDistribution } from "@/lib/rc-fabriquant-types"
import { computeRcFabIndicatif } from "@/lib/rc-fabriquant-underwriting"

export const RC_FAB_ADRESSE_NON_DECLAREE = "Non déclarée sur la demande — à confirmer"

const TYPE_LABELS = new Map<string, string>(RC_TYPE_PRODUIT_OPTIONS.map((option) => [option.value, option.label]))

const PRODUCT_ACTIVITY: Record<RcTypeProduit, string> = {
  alimentaire: "fabrication de produits alimentaires",
  industriel: "fabrication de produits industriels",
  cosmetique: "fabrication de produits cosmétiques",
  electronique: "fabrication de produits électroniques",
  batterie: RC_FAB_BATTERIES_ACTIVITE,
}

const ZONES = new Set<RcZoneDistribution>(["France", "Europe", "Monde"])
const TYPES = new Set<RcTypeProduit>(["alimentaire", "industriel", "cosmetique", "electronique", "batterie"])

export type RcFabDemande = DevisRcFabriquantData & {
  email: string
  typeProduitLabel: string
  activiteAssuree: string
}

function readString(value: unknown, max = 500): string {
  if (typeof value !== "string") return ""
  return value.trim().replace(/\s+/g, " ").slice(0, max)
}

function readBool(source: Record<string, unknown>, key: string): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined
  const value = source[key]
  if (value === true || value === "true" || value === 1) return true
  if (value === false || value === "false" || value === 0) return false
  return undefined
}

function readNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", ".").trim())
        : Number.NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatEur(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return `${Math.round(value).toLocaleString("fr-FR")} €`
}

function ouiNon(value: boolean): string {
  return value ? "Oui" : "Non"
}

export function rcFabActiviteAssuree(input: {
  activiteFabrication?: string
  typeProduit?: RcTypeProduit
}): string {
  const written = readString(input.activiteFabrication, 240)
  if (written) return written
  if (input.typeProduit && PRODUCT_ACTIVITY[input.typeProduit]) return PRODUCT_ACTIVITY[input.typeProduit]
  return RC_FAB_BATTERIES_ACTIVITE
}

export function parseRcFabDemande(raw: string, email = ""): RcFabDemande {
  let source: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(raw || "{}") as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      source = parsed as Record<string, unknown>
    }
  } catch {
    source = {}
  }

  const typeRaw = readString(source.typeProduit, 40)
  const typeProduit = TYPES.has(typeRaw as RcTypeProduit) ? (typeRaw as RcTypeProduit) : undefined
  const zoneRaw = readString(source.zoneDistribution, 40)
  const zoneDistribution = ZONES.has(zoneRaw as RcZoneDistribution) ? (zoneRaw as RcZoneDistribution) : undefined
  const annee = readNumber(source.anneeCreation)
  const ca = readNumber(source.caAnnuelTotal)
  const caExport = readNumber(source.caExport)
  const sinistres = readNumber(source.sinistres5Ans)
  const montantSinistres = readNumber(source.montantSinistres)

  const data: DevisRcFabriquantData = {
    raisonSociale: readString(source.raisonSociale, 180),
    siret: readString(source.siret, 20).replace(/\s/g, ""),
    telephone: readString(source.telephone, 40),
    activiteFabrication: readString(source.activiteFabrication, 240),
    ...(annee != null && annee > 1800 && annee <= new Date().getFullYear()
      ? { anneeCreation: Math.floor(annee) }
      : {}),
    ...(typeProduit ? { typeProduit } : {}),
    ...(zoneDistribution ? { zoneDistribution } : {}),
    ...(readBool(source, "sousTraitance") != null ? { sousTraitance: readBool(source, "sousTraitance") } : {}),
    ...(readBool(source, "controleQualite") != null ? { controleQualite: readBool(source, "controleQualite") } : {}),
    ...(readBool(source, "certification") != null ? { certification: readBool(source, "certification") } : {}),
    ...(readBool(source, "testsSecurite") != null ? { testsSecurite: readBool(source, "testsSecurite") } : {}),
    ...(ca != null && ca > 0 ? { caAnnuelTotal: ca } : {}),
    ...(caExport != null && caExport >= 0 ? { caExport } : {}),
    ...(sinistres != null && sinistres >= 0 ? { sinistres5Ans: Math.floor(sinistres) } : {}),
    ...(montantSinistres != null && montantSinistres >= 0 ? { montantSinistres } : {}),
    ...(readString(source.effectifs, 80) ? { effectifs: readString(source.effectifs, 80) } : {}),
    ...(readString(source.zonesCommercialisation, 240)
      ? { zonesCommercialisation: readString(source.zonesCommercialisation, 240) }
      : {}),
    ...(readString(source.message, 500) ? { message: readString(source.message, 500) } : {}),
  }

  return {
    ...data,
    email: readString(email, 180),
    typeProduitLabel: typeProduit ? TYPE_LABELS.get(typeProduit) || typeProduit : "",
    activiteAssuree: rcFabActiviteAssuree(data),
  }
}

/** Toutes les réponses utiles de la demande, pour les imprimer sans en oublier. */
export function rcFabDemandeLines(demande: RcFabDemande): string[] {
  const lines = [
    `Société : ${demande.raisonSociale || "—"}`,
    `SIRET : ${demande.siret || "—"}`,
    `Téléphone : ${demande.telephone || "—"}`,
    `E-mail : ${demande.email || "—"}`,
    `Activité déclarée : ${demande.activiteFabrication || demande.activiteAssuree || "—"}`,
    `Type de produit : ${demande.typeProduitLabel || "—"}`,
    `Zone de distribution : ${demande.zoneDistribution || "—"}`,
  ]
  if (demande.sousTraitance != null) lines.push(`Sous-traitance : ${ouiNon(demande.sousTraitance)}`)
  if (demande.controleQualite != null) lines.push(`Contrôle qualité : ${ouiNon(demande.controleQualite)}`)
  if (
    demande.typeProduit === "batterie" ||
    demande.typeProduit === "electronique" ||
    demande.certification != null ||
    demande.testsSecurite != null
  ) {
    if (demande.certification != null) lines.push(`Certification : ${ouiNon(demande.certification)}`)
    if (demande.testsSecurite != null) lines.push(`Tests de sécurité : ${ouiNon(demande.testsSecurite)}`)
  }
  lines.push(`Chiffre d'affaires annuel : ${formatEur(demande.caAnnuelTotal) || "—"}`)
  if (demande.caExport != null) lines.push(`Chiffre d'affaires export : ${formatEur(demande.caExport) || "—"}`)
  if (demande.anneeCreation) lines.push(`Année de création : ${demande.anneeCreation}`)
  if (demande.effectifs) lines.push(`Effectifs : ${demande.effectifs}`)
  if (demande.sinistres5Ans != null) lines.push(`Sinistres sur 5 ans : ${demande.sinistres5Ans}`)
  if (demande.montantSinistres != null) {
    lines.push(`Montant des sinistres : ${formatEur(demande.montantSinistres) || "—"}`)
  }
  if (demande.zonesCommercialisation) {
    lines.push(`Précision de commercialisation : ${demande.zonesCommercialisation}`)
  }
  if (demande.message) lines.push(`Message : ${demande.message}`)
  return lines
}

export function rcFabPrimeIndicativeTtc(demande: RcFabDemande): number | null {
  const indicatif = computeRcFabIndicatif(demande)
  const prime = indicatif?.primeIndicative?.primeTtc
  return prime != null && Number.isFinite(prime) && prime > 0 ? prime : null
}

export function rcFabContratOptionLabel(demande: RcFabDemande, createdAt?: string | Date | null): string {
  const company = demande.raisonSociale || demande.email || "Demande sans société"
  const product = demande.typeProduitLabel || "Produit non précisé"
  const date =
    createdAt instanceof Date
      ? createdAt
      : typeof createdAt === "string" && createdAt
        ? new Date(createdAt)
        : null
  const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR") : ""
  return [company, product, demande.email, when].filter(Boolean).join(" — ").slice(0, 180)
}

export const RC_FAB_GARANTIES_IMPRIMEES = {
  plafond: RC_FAB_BATTERIES_PLAFOND_EUR,
  franchise: RC_FAB_BATTERIES_FRANCHISE_EUR,
  protectionJuridique: RC_FAB_BATTERIES_PROTECTION_JURIDIQUE_EUR,
} as const

export function buildRcFabContratConfig(input: {
  demande: RcFabDemande
  referenceContrat: string
  periodicite: RcFabPeriodicity
  primeAnnuelleTtc: number
  primeAnnuelleHt?: number | null
}): RcFabDossierConfig {
  return buildRcFabDossierConfig({
    referenceContrat: input.referenceContrat,
    periodicite: input.periodicite,
    primeAnnuelleTtc: input.primeAnnuelleTtc,
    primeAnnuelleHt: input.primeAnnuelleHt,
    activite: input.demande.activiteAssuree,
    demandeLignes: rcFabDemandeLines(input.demande),
  })
}
