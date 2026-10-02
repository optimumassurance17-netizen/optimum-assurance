import { decennaleGarantieRows } from "@/lib/decennale-garanties-affichage"
import { DO_GARANTIES_LEGALES } from "@/lib/nomenclature-activites"

/**
 * Rubriques que les conditions particulières du marché indiquent toujours
 * (activités, zone, franchise, plafonds, durée, paiement).
 * Texte propre à Optimum : les conditions générales des concurrents ne sont pas reprises.
 */

export const DECENNALE_CP_CADRE = [
  "En cas de divergence, les conditions particulières prévalent sur les conditions générales.",
  "Seules les activités inscrites au contrat sont garanties. Une activité exercée mais absente de cette liste n'est pas couverte.",
  "Zone d'intervention : France métropolitaine, pour les travaux qui correspondent aux activités déclarées.",
  "La franchise s'applique par sinistre. Pour la garantie décennale obligatoire, elle reste à la charge de l'assuré et n'est pas opposable au maître d'ouvrage.",
  "Le plafond de la responsabilité civile décennale s'applique par sinistre. Lorsqu'un chiffre d'affaires annuel est déclaré, ce plafond est égal à deux fois ce chiffre d'affaires.",
  "Les techniques non courantes et les procédés qui s'écartent des activités déclarées doivent être signalés avant le début des travaux. À défaut, ils restent hors garantie.",
  "Les travaux confiés en sous-traitance ne sont couverts que s'ils entrent dans les activités déclarées.",
  "Durée : contrat annuel, reconduit sauf résiliation dans les formes prévues, au plus tard deux mois avant l'échéance, après une première année.",
  "Paiement : prime annuelle TTC, fractionnée par trimestre. Le premier règlement suit le parcours de souscription, les échéances suivantes le prélèvement SEPA.",
] as const

export const DO_CP_CADRE = [
  "En cas de divergence, les conditions particulières prévalent sur les conditions générales.",
  "La garantie dommages-ouvrage est attachée à l'ouvrage désigné, pour les travaux décrits aux présentes.",
  "Ouvrage situé en France métropolitaine, à l'adresse de chantier indiquée.",
  "Franchise : aucune sur la garantie obligatoire dommages-ouvrage.",
  "Habitation : indemnisation à hauteur du coût de réparation des dommages. Hors habitation : à hauteur du coût de réparation, dans la limite du coût total de construction déclaré.",
  "Durée : garantie unique de dix ans à compter de la réception pour la garantie obligatoire. Cette garantie obligatoire n'est pas résiliable.",
  "Protection juridique : défense et recours selon les conditions contractuelles applicables.",
] as const

export function decennaleGarantieClauseLines(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
}): string[] {
  return decennaleGarantieRows(data).map(
    (row) => `${row.nom} — plafond ${row.plafond}, franchise ${row.franchise}. ${row.description}`
  )
}

export function doGarantieClauseLines(): string[] {
  return [DO_GARANTIES_LEGALES.I1, DO_GARANTIES_LEGALES.I2, DO_GARANTIES_LEGALES.I3].map(
    (row) => `${row.libelle} — ${row.duree}. ${row.description}`
  )
}

export function decennaleConditionsParticulieresLines(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
} = {}): string[] {
  return [...DECENNALE_CP_CADRE, ...decennaleGarantieClauseLines(data)]
}

export function doConditionsParticulieresLines(): string[] {
  return [...DO_CP_CADRE, ...doGarantieClauseLines()]
}
