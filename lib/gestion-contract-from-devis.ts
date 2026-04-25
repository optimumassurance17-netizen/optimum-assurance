import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"

/**
 * Données contrat (PDF + JSON document Prisma) à partir d’un devis décennale et du profil client.
 */
export function buildContractDataFromDevisForSignature(
  devisData: Record<string, unknown>,
  user: {
    email: string
    raisonSociale: string | null
    siret: string | null
    adresse: string | null
    codePostal: string | null
    ville: string | null
  },
  contractNumero: string,
  sourceDevis: { id: string; numero: string }
): Record<string, unknown> {
  const now = new Date()
  const dateEffet = now.toLocaleDateString("fr-FR")
  const dateEffetIso = now.toISOString().split("T")[0]
  const dateEcheance = new Date(now.getFullYear(), 11, 31).toLocaleDateString("fr-FR")

  let activites: string[] = []
  let activitesNormalisees: string[] = []
  if (Array.isArray(devisData.activites)) {
    activites = devisData.activites as string[]
  } else if (typeof devisData.activites === "string") {
    activites = devisData.activites
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(devisData.activitesNormalisees)) {
    activitesNormalisees = (devisData.activitesNormalisees as unknown[])
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const pa = Number(devisData.primeAnnuelle) || 0
  const primeMensuelle =
    typeof devisData.primeMensuelle === "number" && Number.isFinite(devisData.primeMensuelle)
      ? devisData.primeMensuelle
      : Math.round((pa / 12) * 100) / 100
  const primeTrimestrielle =
    typeof devisData.primeTrimestrielle === "number" && Number.isFinite(devisData.primeTrimestrielle)
      ? devisData.primeTrimestrielle
      : Math.round((pa / 4) * 100) / 100

  return {
    numero: contractNumero,
    raisonSociale: String(devisData.raisonSociale || user.raisonSociale || "").trim(),
    siret: String(devisData.siret || user.siret || "").replace(/\s/g, ""),
    adresse: String(devisData.adresse || user.adresse || "").trim(),
    codePostal: String(devisData.codePostal || user.codePostal || "").trim(),
    ville: String(devisData.ville || user.ville || "").trim(),
    email: user.email,
    representantLegal: String(devisData.representantLegal || "").trim(),
    civilite: String(devisData.civilite || "M").trim(),
    activites,
    activitesNormalisees,
    chiffreAffaires: Number(devisData.chiffreAffaires) || 0,
    primeAnnuelle: pa,
    primeMensuelle,
    primeTrimestrielle,
    modePaiement: "prelevement",
    periodicitePrelevement: "trimestriel",
    fraisGestionPrelevement: 60,
    // Règle métier: franchise décennale fixe à 1 000 € (toutes activités).
    franchise: FRANCHISE_DECENNALE_EUR,
    plafond: Number(devisData.plafond) > 0 ? Number(devisData.plafond) : 100_000,
    dateEffet,
    dateEffetIso,
    dateEcheance,
    jamaisAssure: Boolean(devisData.jamaisAssure),
    reprisePasse: Boolean(devisData.reprisePasse),
    dateCreationSociete: devisData.dateCreationSociete ? String(devisData.dateCreationSociete) : undefined,
    sourceDevisId: sourceDevis.id,
    sourceDevisNumero: sourceDevis.numero,
  }
}

export function validateDevisContractData(contractData: Record<string, unknown>): string | null {
  if (!String(contractData.raisonSociale || "").trim()) {
    return "Raison sociale manquante sur le devis ou la fiche client."
  }
  if (!String(contractData.representantLegal || "").trim()) {
    return "Représentant légal requis (renseignez-le sur le devis ou éditez le document)."
  }
  if (!Array.isArray(contractData.activites) || contractData.activites.length === 0) {
    return "Au moins une activité est requise."
  }
  const pa = Number(contractData.primeAnnuelle)
  if (!Number.isFinite(pa) || pa <= 0) {
    return "Prime annuelle invalide ou nulle."
  }
  return null
}
