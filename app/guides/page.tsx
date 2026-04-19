import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { truncateForDescription } from "@/lib/seo-metadata-utils"
import { seoBaseUrl, seoBreadcrumbListNode, seoJsonLdGraph } from "@/lib/seo-jsonld-helpers"

const guidesIndexJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Guides", path: "/guides" },
  ]),
  {
    "@type": "ItemList",
    name: "Guides assurance décennale et dommage ouvrage",
    numberOfItems: GUIDES_SEO.length,
    itemListElement: GUIDES_SEO.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: `${seoBaseUrl}/guides/${g.slug}`,
    })),
  },
])

export const metadata = {
  title: "Guides assurance décennale & dommage ouvrage | Obligation, sinistre, DO",
  description: truncateForDescription(
    "Guides pratiques sur l'assurance décennale et la dommage ouvrage : obligation, sinistre, résiliation, auto-construction, clos et couvert. Pour pros BTP et maîtres d'ouvrage.",
    158
  ),
  alternates: { canonical: `${seoBaseUrl}/guides` },
  openGraph: {
    url: `${seoBaseUrl}/guides`,
    title: "Guides décennale & dommage ouvrage | Optimum Assurance",
    description:
      "Obligation, déclaration de sinistre, dommage ouvrage, auto-construction : des guides pratiques pour préparer vos décisions et vos dossiers.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${seoBaseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guides décennale & dommage ouvrage | Optimum Assurance",
    description:
      "Guides pratiques pour pros du BTP et maîtres d'ouvrage : obligation, sinistre, DO, auto-construction.",
    images: [`${seoBaseUrl}/opengraph-image`],
  },
}

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-guides-index" data={guidesIndexJsonLd} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Guides" }]} />
        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
          Guides assurance décennale et dommage ouvrage
        </h1>
        <p className="text-lg text-[#171717] mb-12">
          Tout ce qu&apos;il faut savoir sur l&apos;assurance décennale BTP et l&apos;assurance dommage ouvrage pour maîtres d&apos;ouvrage.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          <Link
            href="/devis"
            className="rounded-2xl border border-[#e5e5e5] bg-white p-5 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
          >
            <p className="font-semibold text-[#0a0a0a]">Devis décennale en ligne</p>
            <p className="mt-1 text-sm text-[#171717]">Passez du guide à la simulation tarifaire en quelques minutes.</p>
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="rounded-2xl border border-[#e5e5e5] bg-white p-5 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
          >
            <p className="font-semibold text-[#0a0a0a]">Devis dommage ouvrage</p>
            <p className="mt-1 text-sm text-[#171717]">Pour particuliers, constructeurs et promoteurs avec étude personnalisée.</p>
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-bold text-[#0a0a0a] mb-4 flex items-center gap-2">
            <span className="bg-[#eff6ff] text-[#2563eb] px-2 py-0.5 rounded text-sm">Décennale BTP</span>
          </h2>
          <div className="space-y-6">
            {GUIDES_SEO.filter((g) => ["obligation-decennale", "resiliation-decennale", "declaration-sinistre"].includes(g.slug)).map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block bg-white rounded-2xl p-6 border border-[#e5e5e5] hover:border-[#2563eb]/40 hover:shadow-md transition-all group"
              >
                <h3 className="text-xl font-bold text-[#0a0a0a] mb-2 group-hover:text-[#2563eb] transition-colors">
                  {guide.title}
                </h3>
                <p className="text-[#171717] text-sm leading-relaxed">
                  {guide.description}
                </p>
                <p className="text-[#2563eb] font-medium mt-3 text-sm">
                  Lire le guide →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#0a0a0a] mb-4 flex items-center gap-2">
            <span className="bg-[#eff6ff] text-[#2563eb] px-2 py-0.5 rounded text-sm">Dommage ouvrage</span>
          </h2>
          <div className="space-y-6">
            {GUIDES_SEO.filter((g) => ["obligation-dommage-ouvrage", "dommage-ouvrage-auto-construction", "garantie-clos-couvert"].includes(g.slug)).map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block bg-white rounded-2xl p-6 border border-[#e5e5e5] hover:border-[#2563eb]/40 hover:shadow-md transition-all group"
              >
                <h3 className="text-xl font-bold text-[#0a0a0a] mb-2 group-hover:text-[#2563eb] transition-colors">
                  {guide.title}
                </h3>
                <p className="text-[#171717] text-sm leading-relaxed">
                  {guide.description}
                </p>
                <p className="text-[#2563eb] font-medium mt-3 text-sm">
                  Lire le guide →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/devis"
            className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold transition-all"
          >
            Devis décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="inline-block border-2 border-[#2563eb] text-[#2563eb] px-8 py-4 rounded-2xl hover:bg-[#eff6ff] font-semibold transition-all"
          >
            Devis dommage ouvrage
          </Link>
        </div>

        <p className="text-center mt-8">
          <Link href="/" className="text-[#2563eb] font-medium hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
