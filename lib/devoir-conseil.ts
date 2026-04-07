import { SITE_URL } from "@/lib/site-url"

export type DevoirConseilProduit =
  | "decennale"
  | "dommage-ouvrage"
  | "do"
  | "rc-fabriquant"
  | "rc_fabriquant"

export type DevoirConseilTexte = {
  titre: string
  contenu: string
  lienCgv: string
  lienAttestations: string
  lienFaq: string
  lienGuide: string
}

const DEVOIR_CONSEIL_TITLE_LOCAL = "Devoir de conseil"

const TEXTE_DECENNALE: DevoirConseilTexte = {
  titre: DEVOIR_CONSEIL_TITLE_LOCAL,
  contenu:
    "En souscrivant, vous confirmez avoir pris connaissance des garanties, exclusions et franchises de votre contrat. Le devis a ete etabli selon les informations que vous avez fournies. Si votre situation change ou si vous avez des questions, contactez-nous avant de signer.",
  lienCgv: "/cgv",
  lienAttestations: "/conditions-attestations",
  lienFaq: "/faq",
  lienGuide: "/guides/obligation-decennale",
}

const TEXTE_DO: DevoirConseilTexte = {
  titre: DEVOIR_CONSEIL_TITLE_LOCAL,
  contenu:
    "En validant cette demande, vous confirmez avoir pris connaissance des garanties, exclusions et conditions de l'assurance dommage ouvrage. Le devis sera etabli selon les informations fournies. Consultez nos guides et la FAQ si vous avez des questions avant de vous engager.",
  lienCgv: "/cgv",
  lienAttestations: "/conditions-attestations",
  lienFaq: "/faq",
  lienGuide: "/guides/obligation-dommage-ouvrage",
}

const TEXTE_RC_FABRIQUANT: DevoirConseilTexte = {
  titre: DEVOIR_CONSEIL_TITLE_LOCAL,
  contenu:
    "En souscrivant, vous confirmez avoir pris connaissance des garanties, exclusions, franchises et limites de l'assurance RC Fabriquant. Le devis est etabli sur la base de vos declarations (activite, produits, zone de distribution, chiffre d'affaires). En cas de changement de situation, informez-nous avant signature.",
  lienCgv: "/cgv",
  lienAttestations: "/conditions-attestations",
  lienFaq: "/faq",
  lienGuide: "/guides",
}

function normalizeProduit(produit: DevoirConseilProduit): "decennale" | "do" | "rc_fabriquant" {
  if (produit === "decennale") return "decennale"
  if (produit === "dommage-ouvrage" || produit === "do") return "do"
  return "rc_fabriquant"
}

export const DEVOIR_CONSEIL_TEXT_BY_PRODUCT = {
  decennale: TEXTE_DECENNALE,
  do: TEXTE_DO,
  rc_fabriquant: TEXTE_RC_FABRIQUANT,
} as const

export const DEVOIR_CONSEIL_TEXTE_BY_PRODUCT = DEVOIR_CONSEIL_TEXT_BY_PRODUCT

// Compat ancien code front (title/content au lieu de titre/contenu)
export const DEVOIR_CONSEIL_TEXT = {
  decennale: { title: TEXTE_DECENNALE.titre, content: TEXTE_DECENNALE.contenu },
  do: { title: TEXTE_DO.titre, content: TEXTE_DO.contenu },
  rc_fabriquant: { title: TEXTE_RC_FABRIQUANT.titre, content: TEXTE_RC_FABRIQUANT.contenu },
} as const

export const DEVOIR_CONSEIL_DO = TEXTE_DO
export const DEVOIR_CONSEIL_DO_TEXT = TEXTE_DO.contenu
export const DEVOIR_CONSEIL_DECENNALE_PDF = TEXTE_DECENNALE.contenu
export const DEVOIR_CONSEIL_TITLE = DEVOIR_CONSEIL_TITLE_LOCAL

export function getDevoirConseilContent(produit: DevoirConseilProduit): DevoirConseilTexte {
  const key = normalizeProduit(produit)
  return DEVOIR_CONSEIL_TEXT_BY_PRODUCT[key]
}

export function getDevoirConseilText(produit: DevoirConseilProduit): string {
  return getDevoirConseilContent(produit).contenu
}

export function getDevoirConseilLinksLine(produit: DevoirConseilProduit = "decennale"): string {
  const t = getDevoirConseilContent(produit)
  return `References utiles : ${SITE_URL}${t.lienCgv} — ${SITE_URL}${t.lienAttestations} — ${SITE_URL}${t.lienFaq} — ${SITE_URL}${t.lienGuide}`
}

export const DEVOIR_CONSEIL_LINKS_LINE = getDevoirConseilLinksLine("do")
export const DEVOIR_CONSEIL_USEFUL_LINKS_LINE = getDevoirConseilLinksLine("decennale")

// Compat API historique
export function getDevoirConseilTexte(produit: DevoirConseilProduit): DevoirConseilTexte {
  return getDevoirConseilContent(produit)
}

export function getDevoirConseilPdfLine(produit: DevoirConseilProduit, siteUrl: string): string {
  const t = getDevoirConseilContent(produit)
  return `${t.titre} : ${t.contenu} References : ${siteUrl}${t.lienCgv} — ${siteUrl}${t.lienAttestations} — ${siteUrl}${t.lienFaq} — ${siteUrl}${t.lienGuide}`
}
