import type { FaqEntry } from "./types"

/** Texte d’enrichissement aligné sur le seed SQL (ex. /assurance-decennale/macon/paris) sans base Supabase. */
export const FALLBACK_BODY_MACON_PARIS =
  "À Paris, les chantiers en milieu dense impliquent souvent une coordination renforcée (voisinage, accès, délais). Optimum Assurance accompagne les maçons avec un parcours devis en ligne et une attestation décennale conforme."

export const FALLBACK_DO_PARTICULIER_PARIS =
  "À Paris, le coût de construction et les contraintes urbaines influencent le montant de la prime DO. Demandez un devis personnalisé : réponse sous 24 h."

/**
 * FAQ générées pour éviter le duplicate content pur : questions/réponses
 * contextualisées par métier + ville (ou type DO + ville).
 */
export function buildFaqDecennaleLocal(
  metierNom: string,
  villeNom: string,
  baseFaq: readonly FaqEntry[]
): FaqEntry[] {
  const local: FaqEntry[] = [
    {
      q: `L’assurance décennale ${metierNom} change-t-elle selon la ville, par exemple à ${villeNom} ?`,
      r: `Non. L’obligation et le contrat sont nationaux. La ville du chantier sert à décrire les travaux, pas à créer une garantie locale. Le devis dépend de l’activité déclarée, du chiffre d’affaires et de la sinistralité.`,
    },
  ]
  return [...local, ...baseFaq]
}

export function buildFaqDoLocal(nomType: string, villeNom: string, baseFaq: readonly FaqEntry[]): FaqEntry[] {
  const local: FaqEntry[] = [
    {
      q: `La dommage ouvrage pour un projet « ${nomType} » dépend-elle de la ville, par exemple ${villeNom} ?`,
      r: `Non. L’obligation est nationale et le contrat suit le projet, pas la commune. Le coût de construction, la nature de l’ouvrage et les pièces techniques font varier l’étude. La ville sert à situer le chantier dans le dossier.`,
    },
  ]
  return [...local, ...baseFaq]
}

/**
 * Empreinte de contenu pour détecter les doublons entre pages (outil / admin futur).
 */
export function hashContentParts(parts: string[]): string {
  const s = parts.join("|")
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return `h${(h >>> 0).toString(16)}`
}
