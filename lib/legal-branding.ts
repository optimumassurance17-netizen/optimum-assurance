import { SITE_URL } from "@/lib/site-url"

/**
 * Identité courtier / assureur et texte légal obligatoire sur les documents PDF.
 * Ne pas dupliquer ces chaînes ailleurs — importer depuis ce module.
 */
export const COMPANY_BRAND = "Optimum Courtage"
export const INSURER_NAME = "Accelerant Insurance"
export const ORIAS_NUMBER = "LPS 28931947"

/** Texte légal obligatoire (attestations, factures, etc.) */
export const LEGAL_DELEGATION_MANDATORY =
  "Optimum Courtage agit par délégation de Accelerant Insurance"

export const LEGAL_ORIAS_LINE = `${COMPANY_BRAND} – ORIAS ${ORIAS_NUMBER}`

export const LEGAL_FOOTER_LINES = [LEGAL_ORIAS_LINE, LEGAL_DELEGATION_MANDATORY] as const

/** Libellé facture acquittée — conforme au mandat / échéancier */
export const INVOICE_PAYMENT_METHOD_PRIMARY = "Prélèvement SEPA"

/** Précision pour la prime initiale réglée via la plateforme (Mollie) */
export const INVOICE_FIRST_SETTLEMENT_NOTE =
  "Règlement de la prime initiale : virement bancaire sécurisé (Mollie)."

/**
 * Mentions complémentaires sur le PDF unique « devis + conditions particulières »
 * une fois le contrat actif (équivalent « contrat » après engagement / paiement).
 */
export function contractBundleLegalParagraphs(product: "decennale" | "do"): readonly string[] {
  const u = SITE_URL
  const cgDo = `Conditions générales et références : ${u}/conditions-generales-dommage-ouvrage — ${u}/cgv — ${u}/conditions-attestations`
  const cgDec = `Conditions générales et références : ${u}/cgv — ${u}/conditions-attestations`
  const refs = product === "do" ? cgDo : cgDec
  return [
    "Le présent document regroupe la proposition commerciale (devis) et les conditions particulières. Il s’applique avec les conditions générales et forme, avec elles, l’ensemble des engagements souscrits auprès du courtier, outre les mentions figurant sur l’attestation ou la quittance après encaissement.",
    `${LEGAL_DELEGATION_MANDATORY}.`,
    "Les montants sont exprimés TTC. Toute modification ultérieure du montant (avenant, indexation, décision de gestion) fera l’objet d’une information préalable au souscripteur et sera reflétée sur les documents contractuels ou factures correspondants.",
    "En cas de retard ou de défaut de paiement à une échéance, les garanties peuvent être suspendues ou le contrat résilié, conformément aux dispositions des conditions générales et à la réglementation applicable. Des pénalités ou frais de recouvrement peuvent être prévus par le contrat.",
    "Pour les parcours avec prélèvement SEPA : les prélèvements sont effectués sur le compte désigné dans le mandat signé par le souscripteur, sous réserve d’acceptation bancaire et de provision du compte.",
    "Pour les parcours avec virement bancaire (Mollie) : chaque règlement est effectué selon les instructions transmises par la plateforme de paiement ; le montant à régler est celui figurant sur le contrat au moment de l’échéance, sauf avenant ou notification contraire.",
    refs,
    `${LEGAL_ORIAS_LINE}.`,
  ]
}

/**
 * Mentions pour l’échéancier annuel (cotisation trimestrielle) — PDF contrats plateforme.
 * Ne pas alléger sans relecture métier / juridique.
 */
export const QUARTERLY_SCHEDULE_LEGAL_PARAGRAPHS = [
  "Le présent document est un échéancier indicatif sur une période de douze mois à compter de la date de prise d’effet indiquée. Il ne se substitue pas aux conditions générales et particulières du contrat, ni au mandat de prélèvement le cas échéant.",
  "Les montants par trimestre sont exprimés TTC. Toute modification ultérieure du montant (avenant, indexation, décision de gestion ou réajustement d’échéance pour les parcours à virement) fera l’objet d’une information préalable au client et sera reflétée sur les appels de cotisation ou factures correspondants.",
  "En cas de retard ou de défaut de paiement à une échéance, les garanties peuvent être suspendues ou le contrat résilié, conformément aux dispositions des conditions générales et à la réglementation applicable. Des pénalités ou frais de recouvrement peuvent être prévus par le contrat.",
  "Pour les parcours avec prélèvement SEPA : les échéances T2 à T4 sont réalisées sur le compte désigné dans le mandat signé par le souscripteur, sous réserve d’acceptation bancaire et de provision du compte.",
  "Pour les parcours avec virement bancaire (Mollie) : chaque échéance est réglée selon les instructions transmises par la plateforme de paiement ; le montant à régler est celui figurant sur le contrat au moment de l’échéance, sauf avenant ou notification contraire.",
  `${LEGAL_DELEGATION_MANDATORY}. Références contractuelles et politique de traitement : conditions générales et documents contractuels remis au souscripteur, accessibles sur le site du courtier.`,
  `${LEGAL_ORIAS_LINE}. Document émis à des fins d’information sur les échéances de cotisation.`,
] as const
