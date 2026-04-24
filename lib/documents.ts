import { prisma } from "./prisma"

const PREFIXES = {
  devis: "DEV",
  devis_do: "DO",
  contrat: "CTR",
  attestation: "ATT",
  attestation_nominative: "ATT-NOM",
  attestation_do: "ATT-DO",
  attestation_non_sinistralite: "ANS",
  avenant: "AVN",
  facture_do: "FAC-DO",
  /** Facture acquittée — 1er trimestre décennale (parcours CB), distinct de facture_do */
  facture_decennale: "FAC-DEC",
} as const

export async function getNextNumero(type: keyof typeof PREFIXES | string): Promise<string> {
  const year = new Date().getFullYear()
  const prefixKey = type in PREFIXES ? (type as keyof typeof PREFIXES) : null
  const prefix = prefixKey ? `${PREFIXES[prefixKey]}-${year}-` : `${String(type).toUpperCase().slice(0, 3)}-${year}-`
  const last = await prisma.document.findFirst({
    where: { type, numero: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
  })
  const num = last
    ? parseInt(last.numero.replace(prefix, ""), 10) + 1
    : 1
  return `${prefix}${String(num).padStart(4, "0")}`
}

export interface DocumentData {
  raisonSociale: string
  siret: string
  adresse?: string
  codePostal?: string
  ville?: string
  email: string
  telephone?: string
  representantLegal?: string
  civilite?: string
  activites: string[]
  chiffreAffaires: number
  primeAnnuelle?: number
  primeMensuelle?: number
  franchise?: number
  plafond?: number
  dateEffet?: string
  dateEcheance?: string
}
