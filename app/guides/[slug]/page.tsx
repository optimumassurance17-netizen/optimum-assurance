import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { truncateForDescription } from "@/lib/seo-metadata-utils"
import { buildGuideArticleJsonLdGraph } from "@/lib/seo-guide-article-jsonld"
import { SITE_URL } from "@/lib/site-url"
import { notFound } from "next/navigation"

const baseUrl = SITE_URL
const defaultOgImage = { url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }

function isDommageOuvrageGuide(slug: string): boolean {
  return (
    slug === "obligation-dommage-ouvrage" ||
    slug === "dommage-ouvrage-auto-construction" ||
    slug === "garantie-clos-couvert"
  )
}

function getRelatedGuides(slug: string) {
  const relatedSlugs = isDommageOuvrageGuide(slug)
    ? ["obligation-dommage-ouvrage", "dommage-ouvrage-auto-construction", "garantie-clos-couvert"]
    : ["obligation-decennale", "declaration-sinistre", "resiliation-decennale"]

  return GUIDES_SEO.filter((guide) => relatedSlugs.includes(guide.slug) && guide.slug !== slug)
}

export async function generateStaticParams() {
  return GUIDES_SEO.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = GUIDES_SEO.find((g) => g.slug === slug)
  if (!data) return {}
  const description = truncateForDescription(data.description, 158)

  return {
    title: `${data.title} | Optimum Assurance`,
    description,
    alternates: { canonical: `${baseUrl}/guides/${data.slug}` },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      siteName: "Optimum Assurance",
      url: `${baseUrl}/guides/${data.slug}`,
      title: data.title,
      description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description,
      images: [`${baseUrl}/opengraph-image`],
    },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = GUIDES_SEO.find((g) => g.slug === slug)
  if (!data) notFound()
  const relatedGuides = getRelatedGuides(data.slug)
  const isDoGuide = isDommageOuvrageGuide(data.slug)

  const guideJsonLd = buildGuideArticleJsonLdGraph({
    slug: data.slug,
    title: data.title,
    description: data.description,
    h1: data.h1,
  })

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id={`jsonld-guide-${data.slug}`} data={guideJsonLd} />
      <Header />

      <article className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Guides", href: "/guides" },
            { label: data.title },
          ]}
        />

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-8">
          {data.h1}
        </h1>

        <div className="prose prose-[#171717] max-w-none">
          {data.content.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">
                  {block.text}
                </h2>
              )
            }
            return (
              <p key={i} className="text-[#171717] leading-relaxed mb-4">
                {block.text}
              </p>
            )
          })}
        </div>

        <section className="mt-12 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-3">Aller plus loin</h2>
          <p className="text-sm text-[#171717] mb-5">
            Complétez votre lecture avec des pages liées pour préparer votre dossier, comprendre vos obligations et passer à l&apos;action.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="rounded-xl border border-[#e5e5e5] bg-white p-4 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
              >
                <p className="font-semibold text-[#0a0a0a]">{guide.title}</p>
                <p className="mt-1 text-sm text-[#171717]">{guide.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isDoGuide ? "/devis-dommage-ouvrage" : "/devis"}
              className="inline-flex items-center justify-center rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8] transition-all"
            >
              {isDoGuide ? "Demander un devis dommage ouvrage" : "Obtenir mon devis décennale"}
            </Link>
            <Link
              href={
                isDoGuide
                  ? "/dommage-ouvrage/auto-construction"
                  : "/assurance-decennale/plomberie-sanitaire"
              }
              className="inline-flex items-center justify-center rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff] transition-all"
            >
              {isDoGuide ? "Voir un profil dommage ouvrage" : "Voir une page métier décennale"}
            </Link>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-[#e5e5e5] flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={isDoGuide ? "/devis-dommage-ouvrage" : "/devis"}
            className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold text-center transition-all"
          >
            {isDoGuide ? "Demander un devis dommage ouvrage" : "Obtenir mon devis"}
          </Link>
          <Link
            href="/faq"
            className="inline-block border-2 border-[#2563eb] text-[#2563eb] px-8 py-4 rounded-2xl hover:bg-[#eff6ff] font-semibold text-center transition-all"
          >
            Voir la FAQ
          </Link>
        </div>

        <p className="text-center mt-8">
          <Link href="/guides" className="text-[#2563eb] font-medium hover:underline">
            ← Tous les guides
          </Link>
        </p>
      </article>
    </main>
  )
}
