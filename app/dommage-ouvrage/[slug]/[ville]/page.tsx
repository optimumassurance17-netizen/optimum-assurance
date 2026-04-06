import dynamic from "next/dynamic"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { CtaDevis } from "@/components/seo-programmatic/CtaDevis"
import { InternalLinkSection } from "@/components/seo-programmatic/InternalLinkSection"
import { SeoTextBlock } from "@/components/seo-programmatic/SeoTextBlock"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { buildFaqDoLocal } from "@/lib/seo-programmatic/content"
import {
  fetchDoSiblingVilles,
  fetchDoStaticParams,
  getDoLocalPage,
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
  return fetchDoStaticParams()
}

const baseUrl = SITE_URL
const defaultOgImage = { url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; ville: string }>
}) {
  const { slug, ville } = await params
  const data = await getDoLocalPage(slug, ville)
  if (!data) return {}

  const path = `/dommage-ouvrage/${data.slug}/${data.villeSlug}`
  const title = `Assurance dommage ouvrage ${data.nom} à ${data.villeNom} | Devis | Optimum`
  const description = buildProgrammaticMetaDescription(
    `Assurance dommage ouvrage ${data.nom} à ${data.villeNom} : obligation, garanties et devis sous 24 h.`,
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

export default async function DoVillePage({
  params,
}: {
  params: Promise<{ slug: string; ville: string }>
}) {
  const { slug, ville } = await params
  const data = await getDoLocalPage(slug, ville)
  if (!data) notFound()

  const staticDo = DO_SEO.find((d) => d.slug === data.slug)
  const baseFaq = staticDo?.faq ?? []
  const faq = buildFaqDoLocal(data.nom, data.villeNom, baseFaq)

  const path = `/dommage-ouvrage/${data.slug}/${data.villeSlug}`
  const parentPath = `/dommage-ouvrage/${data.slug}`

  const siblingVilles = await fetchDoSiblingVilles(data.slug, data.villeSlug)

  const jsonLd = seoJsonLdGraph([
    seoBreadcrumbListNode([
      { name: "Accueil", path: "/" },
      { name: "Dommage ouvrage", path: "/devis-dommage-ouvrage" },
      { name: data.nom, path: parentPath },
      { name: data.villeNom, path },
    ]),
    seoWebPageNode({
      path,
      name: `Assurance dommage ouvrage ${data.nom} à ${data.villeNom}`,
      description: data.description,
    }),
    seoFaqPageNode(faq),
  ])

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id={`jsonld-do-${data.slug}-${data.villeSlug}`} data={jsonLd} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="text-sm mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            Accueil
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href="/devis-dommage-ouvrage" className="text-blue-600 hover:underline">
            Dommage ouvrage
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href={parentPath} className="text-blue-600 hover:underline">
            {data.nom}
          </Link>
          <span className="text-[#333333] mx-2">/</span>
          <span className="text-[#0a0a0a] font-medium">{data.villeNom}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-3">
          Assurance dommage ouvrage {data.nom} à {data.villeNom}
        </h1>
        <p className="text-base md:text-lg text-blue-600 font-semibold mb-4">
          Obligation légale — devis personnalisé sous 24 h
        </p>

        <SeoTextBlock title="Description">
          <p>{data.description}</p>
          <p>
            Cette page cible les projets à <strong>{data.villeNom}</strong>
            {data.population != null ? (
              <>
                {" "}
                (agglomération d’environ {data.population.toLocaleString("fr-FR")} habitants)
              </>
            ) : null}
            . Pour le rappel général sur votre profil, voir aussi{" "}
            <Link href={parentPath} className="text-blue-600 font-medium hover:underline">
              {data.nom}
            </Link>
            .
          </p>
        </SeoTextBlock>

        {data.bodyExtra ? (
          <SeoTextBlock title="Contexte local">
            <p>{data.bodyExtra}</p>
          </SeoTextBlock>
        ) : null}

        <SeoTextBlock title="Obligations">
          <p>
            L’assurance dommage ouvrage est obligatoire pour les maîtres d’ouvrage concernés avant le début des
            travaux. Elle garantit les dommages affectant la solidité de l’ouvrage ou le rendant impropre à sa
            destination.
          </p>
        </SeoTextBlock>

        <div className="mb-12">
          <CtaDevis
            href="/devis-dommage-ouvrage"
            label="Demander un devis dommage ouvrage"
            utm={{ source: "seo", medium: "programmatic", campaign: `do-${data.slug}-${data.villeSlug}` }}
          />
        </div>

        <InternalLinkSection title="Autres villes pour ce profil" links={siblingVilles} />

        <FaqSEO items={faq} />
      </div>
    </main>
  )
}
