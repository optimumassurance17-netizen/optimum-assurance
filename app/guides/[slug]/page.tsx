import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { buildGuideArticleJsonLdGraph } from "@/lib/seo-guide-article-jsonld"
import { SITE_URL } from "@/lib/site-url"
import { notFound } from "next/navigation"

const baseUrl = SITE_URL
const defaultOgImage = { url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }

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

  return {
    title: `${data.title} | Optimum Assurance`,
    description: data.description,
    alternates: { canonical: `${baseUrl}/guides/${data.slug}` },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      siteName: "Optimum Assurance",
      url: `${baseUrl}/guides/${data.slug}`,
      title: data.title,
      description: data.description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
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

  const guideJsonLd = buildGuideArticleJsonLdGraph({
    slug: data.slug,
    title: data.title,
    description: data.description,
    h1: data.h1,
  })

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd) }} />
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

        <div className="mt-12 pt-8 border-t border-[#e5e5e5] flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/devis"
            className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold text-center transition-all"
          >
            Obtenir mon devis
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
