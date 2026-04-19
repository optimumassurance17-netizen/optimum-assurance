import dynamic from "next/dynamic"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { CtaDevis } from "@/components/seo-programmatic/CtaDevis"
import { InternalLinkSection } from "@/components/seo-programmatic/InternalLinkSection"
import { PriceBlock } from "@/components/seo-programmatic/PriceBlock"
import { SeoTextBlock } from "@/components/seo-programmatic/SeoTextBlock"
import { METIERS_SEO } from "@/lib/metiers-seo"
import { buildFaqDecennaleLocal } from "@/lib/seo-programmatic/content"
import {
  fetchDecennaleSiblingMetiers,
  fetchDecennaleSiblingVilles,
  fetchDecennaleStaticParams,
  getDecennaleLocalPage,
} from "@/lib/seo-programmatic/queries"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { buildProgrammaticMetaDescription } from "@/lib/seo-metadata-utils"
import { SITE_URL } from "@/lib/site-url"

const FaqSEO = dynamic(() =>
  import("@/components/seo-programmatic/FaqSEO").then((m) => m.FaqSEO)
)

export const revalidate = 60

export async function generateStaticParams() {
  return fetchDecennaleStaticParams()
}

const baseUrl = SITE_URL
const defaultOgImage = { url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metier: string; ville: string }>
}) {
  const { metier, ville } = await params
  const data = await getDecennaleLocalPage(metier, ville)
  if (!data) return {}

  const path = `/assurance-decennale/${data.metierSlug}/${data.villeSlug}`
  const title = `Assurance décennale ${data.metierNom} à ${data.villeNom} | Devis en ligne | Optimum`
  const description = buildProgrammaticMetaDescription(
    `Assurance décennale pour ${data.metierNom} à ${data.villeNom} : obligations, prix indicatif et devis sous 3 minutes.`,
    data.description,
    158
  )

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}${path}` },
    robots: data.indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "Optimum Assurance",
      url: `${baseUrl}${path}`,
      title,
      description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/opengraph-image`],
    },
  }
}

export default async function MetierVillePage({
  params,
}: {
  params: Promise<{ metier: string; ville: string }>
}) {
  const { metier, ville } = await params
  const data = await getDecennaleLocalPage(metier, ville)
  if (!data) notFound()

  const staticMetier = METIERS_SEO.find((m) => m.slug === data.metierSlug)
  const baseFaq = staticMetier?.faq ?? []
  const faq = buildFaqDecennaleLocal(data.metierNom, data.villeNom, baseFaq)

  const path = `/assurance-decennale/${data.metierSlug}/${data.villeSlug}`
  const parentPath = `/assurance-decennale/${data.metierSlug}`

  const [siblingVilles, siblingMetiers] = await Promise.all([
    fetchDecennaleSiblingVilles(data.metierSlug, data.villeSlug),
    fetchDecennaleSiblingMetiers(data.villeSlug, data.metierSlug),
  ])

  const jsonLd = seoJsonLdGraph([
    seoBreadcrumbListNode([
      { name: "Accueil", path: "/" },
      { name: "Devis décennale", path: "/devis" },
      { name: `Décennale ${data.metierNom}`, path: parentPath },
      { name: `${data.villeNom}`, path },
    ]),
    seoWebPageNode({
      path,
      name: `Assurance décennale ${data.metierNom} à ${data.villeNom}`,
      description: data.description,
    }),
    seoFaqPageNode(faq),
  ])

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id={`jsonld-decennale-${data.metierSlug}-${data.villeSlug}`} data={jsonLd} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="text-sm mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            Accueil
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href="/devis" className="text-blue-600 hover:underline">
            Devis
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href={parentPath} className="text-blue-600 hover:underline">
            {data.metierNom}
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <span className="text-[#0a0a0a] font-medium">{data.villeNom}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-3">
          Assurance décennale {data.metierNom} à {data.villeNom}
        </h1>
        <p className="text-base md:text-lg text-blue-600 font-semibold mb-4">
          Spécialiste construction — devis en ligne, attestation conforme
        </p>

        <SeoTextBlock title="Pourquoi cette page ?">
          <p>
            Cette page est dédiée aux professionnels recherchant une{" "}
            <strong>assurance décennale {data.metierNom.toLowerCase()}</strong> pour des chantiers autour de{" "}
            <strong>{data.villeNom}</strong>
            {data.population != null ? (
              <>
                {" "}
                (agglomération d’environ {data.population.toLocaleString("fr-FR")} habitants)
              </>
            ) : null}
            . L’obligation légale est nationale ; le contexte local influence surtout l’organisation et la
            réalité du chantier.
          </p>
          <p>{data.description}</p>
        </SeoTextBlock>

        {data.bodyExtra ? (
          <SeoTextBlock title="Contexte local">
            <p>{data.bodyExtra}</p>
          </SeoTextBlock>
        ) : null}

        {data.risques ? (
          <SeoTextBlock title="Risques typiquement couverts">
            <p>{data.risques}</p>
          </SeoTextBlock>
        ) : null}

        <SeoTextBlock title="Obligations légales (rappel)">
          <p>
            L’assurance décennale est obligatoire pour les constructeurs et travaux couverts par la loi Spinetta.
            Vous devez pouvoir fournir une attestation au maître d’ouvrage avant signature du contrat de
            construction. Pour en savoir plus sur votre métier au niveau national, consultez aussi la page{" "}
            <Link href={parentPath} className="text-blue-600 font-medium hover:underline">
              assurance décennale {data.metierNom}
            </Link>
            {" "}et notre{" "}
            <Link href="/guides/obligation-decennale" className="text-blue-600 font-medium hover:underline">
              guide sur l’obligation décennale
            </Link>
            .
          </p>
        </SeoTextBlock>

        <PriceBlock
          amountLabel={data.prixIndicatif}
          hint="Montant indicatif : sur le site principal, affichage souvent en équivalent mensuel ; paiement trimestriel. Prime selon chiffre d’affaires et sinistralité."
        />

        <div className="mb-12">
          <CtaDevis
            href="/devis"
            utm={{ source: "seo", medium: "programmatic", campaign: `decennale-${data.metierSlug}-${data.villeSlug}` }}
          />
        </div>

        <InternalLinkSection title="Autres villes pour ce métier" links={siblingVilles} />
        <InternalLinkSection title="Autres métiers dans cette ville" links={siblingMetiers} />

        <FaqSEO items={faq} />
      </div>
    </main>
  )
}
