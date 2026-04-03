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
      q: `L’assurance décennale ${metierNom} est-elle obligatoire à ${villeNom} ?`,
      r: `Oui. L’obligation est nationale (loi Spinetta) : elle s’applique à ${villeNom} comme partout en France pour les travaux relevant de votre activité couverte par la décennale.`,
    },
    {
      q: `Où souscrire une assurance décennale ${metierNom} près de ${villeNom} ?`,
      r: `Vous pouvez obtenir un devis en ligne en quelques minutes sur Optimum Assurance, avec attestation adaptée aux exigences du maître d’ouvrage, quel que soit le secteur autour de ${villeNom}.`,
    },
  ]
  return [...local, ...baseFaq]
}

export function buildFaqDoLocal(nomType: string, villeNom: string, baseFaq: readonly FaqEntry[]): FaqEntry[] {
  const local: FaqEntry[] = [
    {
      q: `L’assurance dommage ouvrage est-elle obligatoire pour un projet à ${villeNom} ?`,
      r: `Oui pour les maîtres d’ouvrage concernés : l’obligation est nationale. Le contexte local (coût de construction, typologie de chantier) influence surtout le montant de la prime, pas le principe de souscription.`,
    },
    {
      q: `Quand souscrire une DO pour un chantier à ${villeNom} ?`,
      r: `Avant le début des travaux. Pour un profil « ${nomType} », nous vous recommandons de demander un devis dès que le permis de construire et les éléments techniques principaux sont connus.`,
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
