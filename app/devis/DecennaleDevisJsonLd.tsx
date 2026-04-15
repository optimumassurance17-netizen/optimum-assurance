"use client"

import { JsonLd } from "@/components/JsonLd"
import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif"
import { faqDevis } from "@/lib/garanties-data"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"

const devisJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Devis décennale", path: "/devis" },
  ]),
  seoWebPageNode({
    path: "/devis",
    name: "Devis assurance décennale BTP",
    description: `Simulateur en ligne — tarif selon chiffre d'affaires et activités BTP. Dès ${EQ_MENSUEL_MIN} €/mois (équivalent).`,
  }),
  seoFaqPageNode(faqDevis),
])

export function DecennaleDevisJsonLd() {
  return <JsonLd id="jsonld-devis" data={devisJsonLd} />
}
