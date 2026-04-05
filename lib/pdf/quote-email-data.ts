import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import { TYPES_OUVRAGE } from "@/lib/dommage-ouvrage-types"
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"
import type { InsuranceData } from "@/lib/pdf/types"
import { PdfValidationError } from "@/lib/pdf/errors"

function isoAddYears(iso: string, years: number): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toISOString()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString()
}

function safeIsoDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw?.trim()) return fallbackIso
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? fallbackIso : d.toISOString()
}

/**
 * Données PDF devis décennale à partir du payload `/api/devis/send-email`.
 */
export function insuranceDataFromDecennaleDevis(
  devis: unknown,
  createdAtIso: string
): Omit<InsuranceData, "contractNumber"> {
  const d = devis as Record<string, unknown>
  const tarif = d.tarif as { primeAnnuelle?: number } | undefined
  if (!tarif || typeof tarif.primeAnnuelle !== "number" || !Number.isFinite(tarif.primeAnnuelle)) {
    throw new PdfValidationError("tarif.primeAnnuelle manquant pour le PDF décennale", "INVALID_DATA")
  }
  const activites = d.activites as string[] | undefined
  if (!activites?.length) {
    throw new PdfValidationError("activites requis pour le PDF décennale", "MISSING_FIELD")
  }

  const raison =
    (typeof d.raisonSociale === "string" && d.raisonSociale.trim()) ||
    (typeof d.raison_sociale === "string" && d.raison_sociale.trim()) ||
    ""
  const adresse = typeof d.adresse === "string" ? d.adresse.trim() : ""
  const codePostal = typeof d.codePostal === "string" ? d.codePostal.trim() : ""
  const ville = typeof d.ville === "string" ? d.ville.trim() : ""
  const address = [adresse, codePostal, ville].filter(Boolean).join(", ").trim() || "Adresse non renseignée"

  const siretRaw = d.siret
  const siret = typeof siretRaw === "string" ? siretRaw.replace(/\s/g, "") : ""

  return {
    productType: "decennale",
    clientName: raison || "Prospect",
    siret: siret || undefined,
    address,
    activities: activites,
    premium: tarif.primeAnnuelle,
    createdAt: createdAtIso,
    startDate: createdAtIso,
    endDate: isoAddYears(createdAtIso, 1),
  }
}

/**
 * Données PDF devis DO à partir du questionnaire (demande en ligne).
 * Retourne `null` si le montant ou les champs obligatoires manquent.
 * Le numéro de contrat est alloué par l’appelant après succès de cette étape.
 */
export function insuranceDataFromDoQuestionnaire(
  data: Partial<DevisDommageOuvrageData>,
  coutTotal: number,
  createdAtIso: string
): Omit<InsuranceData, "contractNumber"> | null {
  const tarif = calculerTarifDommageOuvrage(coutTotal, {
    garanties: (data.garanties as string[]) ?? [],
  })
  if (!tarif || tarif.primeAnnuelle <= 0) return null

  const addrLine = [data.adresse?.trim(), data.codePostal?.trim(), data.ville?.trim()].filter(Boolean).join(", ")
  if (!addrLine) return null

  const projectAddress = [data.adresseConstruction, data.codePostalConstruction, data.villeConstruction]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join(", ")
  if (!projectAddress) return null

  const typeLabel = TYPES_OUVRAGE.find((t) => t.value === data.typeOuvrage)?.label ?? "Chantier"
  const villeCh = data.villeConstruction?.trim() ?? ""
  const projectName = data.permisConstruireNumero?.trim()
    ? `Permis ${data.permisConstruireNumero.trim()} — ${villeCh}`.trim()
    : `${typeLabel} — ${villeCh}`.trim()

  const start = safeIsoDate(
    typeof data.dateDebutTravaux === "string" ? data.dateDebutTravaux : undefined,
    createdAtIso
  )
  const end = safeIsoDate(
    typeof data.dateAchevementTravaux === "string" ? data.dateAchevementTravaux : undefined,
    isoAddYears(createdAtIso, 1)
  )

  return {
    productType: "do",
    clientName: (data.raisonSociale || "").trim() || "Maître d’ouvrage",
    address: addrLine,
    projectName,
    projectAddress,
    constructionNature: typeLabel,
    premium: tarif.primeAnnuelle,
    createdAt: createdAtIso,
    startDate: start,
    endDate: end,
  }
}
