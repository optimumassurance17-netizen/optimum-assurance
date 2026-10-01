import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ActivitesCatalogueList } from "@/components/ActivitesCatalogueList"
import { ACTIVITES_AVEC_TARIFS } from "@/lib/activites-btp"
import { ACTIVITE_CATALOGUE, activiteAnchorId } from "@/lib/decennale-activites-catalogue"
import {
  EXCLUSIONS_LEGALES_COMMUNES,
  OUVRAGES_EXCLUS_DECENNALE,
} from "@/lib/nomenclature-activites"
import { absoluteBrandTitle } from "@/lib/seo-title"
import { truncateForDescription } from "@/lib/seo-metadata-utils"
import { seoBaseUrl, seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const description = truncateForDescription(
  "Liste des activités du devis décennale : descriptif de chaque métier du menu et exclusions usuelles du marché, alignées sur la nomenclature France Assureurs.",
  158
)

const groups = Array.from(
  ACTIVITES_AVEC_TARIFS.reduce((map, item) => {
    const fiche = ACTIVITE_CATALOGUE[item.activite]
    const bucket = map.get(item.categorie) ?? []
    bucket.push({
      activite: item.activite,
      description: fiche.description,
      exclusions: fiche.exclusions,
    })
    map.set(item.categorie, bucket)
    return map
  }, new Map<string, { activite: string; description: string; exclusions: string[] }[]>())
).map(([categorie, items]) => ({ categorie, items }))

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Assurance décennale", path: "/assurance-decennale" },
    { name: "Activités et exclusions", path: "/assurance-decennale/activites" },
  ]),
  seoWebPageNode({
    path: "/assurance-decennale/activites",
    name: "Activités décennale et exclusions",
    description,
  }),
  {
    "@type": "ItemList",
    name: "Activités du devis décennale Optimum Assurance",
    numberOfItems: ACTIVITES_AVEC_TARIFS.length,
    itemListElement: ACTIVITES_AVEC_TARIFS.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.activite,
      url: `${seoBaseUrl}/assurance-decennale/activites#${activiteAnchorId(item.activite)}`,
    })),
  },
])

export const metadata = {
  title: absoluteBrandTitle("Activités décennale : descriptifs et exclusions"),
  description,
  alternates: { canonical: `${seoBaseUrl}/assurance-decennale/activites` },
  openGraph: {
    url: `${seoBaseUrl}/assurance-decennale/activites`,
    title: "Activités décennale : descriptifs et exclusions | Optimum Assurance",
    description,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
  },
}

export default function ActivitesDecennalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-activites-decennale" data={jsonLd} />
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Assurance décennale", href: "/assurance-decennale" },
            { label: "Activités et exclusions" },
          ]}
        />
        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
          Activités du devis décennale : descriptifs et exclusions
        </h1>
        <p className="text-lg text-[#171717] leading-relaxed mb-6">
          Les {ACTIVITES_AVEC_TARIFS.length} activités ci-dessous sont celles du menu du devis. Le descriptif
          indique le périmètre habituel du métier. Les exclusions sont celles que l&apos;on retrouve dans la
          nomenclature France Assureurs et dans les contrats décennale du marché.
        </p>
        <p className="text-sm text-[#171717] leading-relaxed mb-8">
          Seules les activités cochées au contrat sont garanties. Cette page ne remplace pas les conditions
          particulières ni l&apos;attestation. Un métier absent de la liste se demande via{" "}
          <Link href="/etude/domaine" className="text-[#2563eb] font-medium hover:underline">
            l&apos;étude de domaine
          </Link>
          .
        </p>

        <section className="mb-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-3">Exclusions communes à toutes les activités</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#171717]">
            {EXCLUSIONS_LEGALES_COMMUNES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="mt-6 font-semibold text-[#0a0a0a]">Ouvrages hors régime obligatoire</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#171717]">
            {OUVRAGES_EXCLUS_DECENNALE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <ActivitesCatalogueList groups={groups} />

        <div className="mt-12">
          <Link
            href="/devis"
            className="inline-flex items-center justify-center rounded-2xl bg-[#2563eb] px-6 py-3 font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Choisir mes activités et obtenir un devis
          </Link>
        </div>
      </div>
    </main>
  )
}
