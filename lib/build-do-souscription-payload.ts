import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import { TYPES_OUVRAGE } from "@/lib/dommage-ouvrage-types"
import { calculerTarifDommageOuvrage, FRANCHISE_DOMMAGE_OUVRAGE_EUR } from "@/lib/tarification-dommage-ouvrage"
import type { DevisResult } from "@/lib/tarification"
import type { DoSouscriptionInsurancePayload, SouscriptionData } from "@/lib/types"

/** Construit le payload API contrat DO + session (SIRET 14 ch. requis pour le scoring). */
export function buildDoSouscriptionInsurancePayload(
  data: Partial<DevisDommageOuvrageData>,
  coutTotal: number
): DoSouscriptionInsurancePayload | null {
  const tarif = calculerTarifDommageOuvrage(coutTotal, {
    garanties: (data.garanties as string[]) ?? [],
  })
  if (!tarif || tarif.primeAnnuelle <= 0) return null

  const siret = (data.siret || "").replace(/\D/g, "")
  if (siret.length !== 14) return null

  if (!data.raisonSociale?.trim() || !data.email?.trim()) return null

  const addrLine = [data.adresse?.trim(), data.codePostal?.trim(), data.ville?.trim()].filter(Boolean).join(", ")
  if (!addrLine) return null

  const projectAddress = [data.adresseConstruction, data.codePostalConstruction, data.villeConstruction]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join(", ")
  if (!projectAddress) return null

  const typeLabel = TYPES_OUVRAGE.find((t) => t.value === data.typeOuvrage)?.label ?? "Chantier"

  const projectName = data.permisConstruireNumero?.trim()
    ? `Permis ${data.permisConstruireNumero.trim()} — ${data.villeConstruction?.trim() ?? ""}`.trim()
    : `${typeLabel} — ${data.villeConstruction?.trim() ?? ""}`.trim()

  return {
    productType: "do",
    siret,
    raisonSociale: data.raisonSociale.trim(),
    adresse: (data.adresse || "").trim(),
    codePostal: (data.codePostal || "").trim(),
    ville: (data.ville || "").trim(),
    email: data.email.trim(),
    telephone: (data.telephone || "").trim(),
    premium: tarif.primeAnnuelle,
    projectName,
    projectAddress,
    constructionNature: typeLabel,
  }
}

function tarifShimFromDoPremium(premium: number): DevisResult {
  const primeMensuelle = Math.round((premium / 12) * 100) / 100
  const primeTrimestrielle = Math.round((premium / 4) * 100) / 100
  return {
    primeAnnuelle: premium,
    primeMensuelle,
    primeTrimestrielle,
    franchise: FRANCHISE_DOMMAGE_OUVRAGE_EUR,
    plafond: 0,
    details: {
      base: premium,
      majorationSinistres: 0,
      majorationNouveau: 0,
      majorationActivites: 0,
    },
  }
}

/** Compatibilité page signature / Yousign (produit historique) — métadonnées DO conservées. */
export function doPayloadToSouscriptionShim(d: DoSouscriptionInsurancePayload): SouscriptionData {
  const nat = d.constructionNature?.trim() || "Dommage ouvrage"
  return {
    siret: d.siret,
    chiffreAffaires: 0,
    sinistres: 0,
    jamaisAssure: true,
    activites: [nat],
    tarif: tarifShimFromDoPremium(d.premium),
    raisonSociale: d.raisonSociale,
    adresse: d.adresse,
    codePostal: d.codePostal,
    ville: d.ville,
    email: d.email,
    telephone: d.telephone,
    representantLegal: d.representantLegal?.trim() || d.raisonSociale,
    civilite: d.civilite ?? "M",
    dateCreationSociete: d.dateCreationSociete,
    insuranceProduct: "do",
    doProjectName: d.projectName,
    doProjectAddress: d.projectAddress,
  }
}
