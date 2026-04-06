import type { DevisResult } from "@/lib/tarification"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"
import type { SouscriptionData } from "@/lib/types"

type UserFields = {
  email: string
  raisonSociale: string | null
  siret: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  telephone: string | null
}

/**
 * Reconstruit le payload `sessionStorage` (clé signature) à partir du contrat enregistré
 * après signature (parcours gestion ou retour sans brouillon navigateur).
 */
export function buildSignatureSessionFromContrat(
  contratData: Record<string, unknown>,
  contratNumero: string,
  user: UserFields
): SouscriptionData & {
  signedContractNumero: string
  signedContractData: Record<string, unknown>
} {
  const pa = Number(contratData.primeAnnuelle) || 0
  const primeTrimestrielle =
    typeof contratData.primeTrimestrielle === "number" && Number.isFinite(contratData.primeTrimestrielle)
      ? contratData.primeTrimestrielle
      : Math.round((pa / 4) * 100) / 100
  const primeMensuelle =
    typeof contratData.primeMensuelle === "number" && Number.isFinite(contratData.primeMensuelle)
      ? contratData.primeMensuelle
      : Math.round((pa / 12) * 100) / 100

  const tarif: DevisResult = {
    primeAnnuelle: pa,
    primeMensuelle,
    primeTrimestrielle,
    franchise:
      contratData.franchise != null && Number.isFinite(Number(contratData.franchise))
        ? Number(contratData.franchise)
        : FRANCHISE_DECENNALE_EUR,
    plafond: Number(contratData.plafond) > 0 ? Number(contratData.plafond) : 100_000,
    details: {
      base: pa,
      majorationSinistres: 0,
      majorationNouveau: 0,
      majorationActivites: 0,
    },
  }

  let activites: string[] = []
  if (Array.isArray(contratData.activites)) {
    activites = contratData.activites as string[]
  }

  const civiliteRaw = String(contratData.civilite || "M").trim()
  const civilite: "M" | "Mme" | "Mlle" =
    civiliteRaw === "Mme" ? "Mme" : civiliteRaw === "Mlle" ? "Mlle" : "M"

  const souscription: SouscriptionData = {
    siret: String(contratData.siret || user.siret || ""),
    chiffreAffaires: Number(contratData.chiffreAffaires) || 0,
    sinistres: 0,
    jamaisAssure: Boolean(contratData.jamaisAssure),
    reprisePasse: Boolean(contratData.reprisePasse),
    activites,
    raisonSociale: String(contratData.raisonSociale || user.raisonSociale || ""),
    adresse: String(contratData.adresse || user.adresse || ""),
    codePostal: String(contratData.codePostal || user.codePostal || ""),
    ville: String(contratData.ville || user.ville || ""),
    email: user.email,
    telephone: String(user.telephone || "").trim(),
    representantLegal: String(contratData.representantLegal || ""),
    civilite,
    tarif,
    dateCreationSociete: contratData.dateCreationSociete
      ? String(contratData.dateCreationSociete)
      : undefined,
    insuranceProduct: "decennale",
  }

  return {
    ...souscription,
    signedContractNumero: contratNumero,
    signedContractData: { ...contratData, numero: contratNumero },
  }
}
