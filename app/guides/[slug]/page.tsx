import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { notFound } from "next/navigation"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

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
      url: `${baseUrl}/guides/${data.slug}`,
      title: data.title,
      description: data.description,
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${baseUrl}/guides` },
      { "@type": "ListItem", position: 3, name: data.title, item: `${baseUrl}/guides/${data.slug}` },
    ],
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    author: { "@type": "Organization", name: "Optimum Assurance", url: baseUrl },
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
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
            className="inline-block bg-[#C65D3B] text-white px-8 py-4 rounded-2xl hover:bg-[#B04F2F] font-semibold text-center transition-all"
          >
            Obtenir mon devis
          </Link>
          <Link
            href="/faq"
            className="inline-block border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-4 rounded-2xl hover:bg-[#FEF3F0] font-semibold text-center transition-all"
          >
            Voir la FAQ
          </Link>
        </div>

        <p className="text-center mt-8">
          <Link href="/guides" className="text-[#C65D3B] font-medium hover:underline">
            ← Tous les guides
          </Link>
        </p>
      </article>
    </main>
  )
}
