import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { METIERS_SEO } from "@/lib/metiers-seo"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode, seoBaseUrl } from "@/lib/seo-jsonld-helpers"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const pageDescription = truncateForDescription(
  "Assurance décennale par activité : plomberie, électricité, maçonnerie, couverture, menuiserie, BET, rénovation énergétique et plus de 100 activités du BTP. Accédez à la page adaptée à votre métier et demandez votre devis en ligne.",
  158
)

const decennaleIndexJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Assurance décennale", path: "/assurance-decennale" },
  ]),
  seoWebPageNode({
    path: "/assurance-decennale",
    name: "Assurance décennale par métier",
    description: pageDescription,
  }),
  {
    "@type": "ItemList",
    name: "Activités décennale Optimum Assurance",
    numberOfItems: METIERS_SEO.length,
    itemListElement: METIERS_SEO.map((metier, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: metier.nom,
      url: `${seoBaseUrl}/assurance-decennale/${metier.slug}`,
    })),
  },
])

export const metadata = {
  title: "Assurance décennale par métier | Plus de 100 activités BTP",
  description: pageDescription,
  alternates: { canonical: `${seoBaseUrl}/assurance-decennale` },
  openGraph: {
    url: `${seoBaseUrl}/assurance-decennale`,
    title: "Assurance décennale par métier | Optimum Assurance",
    description: pageDescription,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${seoBaseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Assurance décennale par métier | Optimum Assurance",
    description: "Plus de 100 activités BTP couvertes : trouvez la page adaptée à votre métier.",
    images: [`${seoBaseUrl}/opengraph-image`],
  },
}

export default function AssuranceDecennaleIndexPage() {
  const featured = METIERS_SEO.slice(0, 12)
  const secondary = METIERS_SEO.slice(12)

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-decennale-index" data={decennaleIndexJsonLd} />
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Assurance décennale" }]} />
        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
          Assurance décennale par activité du BTP
        </h1>
        <p className="text-lg text-[#171717] mb-8 leading-relaxed">
          Optimum Assurance couvre plus de 100 activites du BTP : second oeuvre, gros oeuvre, structure, toiture,
          facade, isolation, exterieur, maintenance et prestations intellectuelles du batiment.
        </p>

        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-3">Trouver votre activite</h2>
          <p className="text-sm text-[#171717] leading-relaxed">
            Choisissez la page la plus proche de votre metier pour acceder a un contenu adapte, aux liens utiles et au
            devis en ligne pre-rempli selon votre activite.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Activites les plus recherchees</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((metier) => (
              <Link
                key={metier.slug}
                href={`/assurance-decennale/${metier.slug}`}
                className="rounded-2xl border border-[#e5e5e5] bg-white p-5 hover:border-blue-600/30 hover:bg-blue-50 transition-all"
              >
                <p className="font-semibold text-[#0a0a0a]">Assurance decennale {metier.nom}</p>
                <p className="mt-2 text-sm text-[#171717]">{metier.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {secondary.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Autres activites couvertes</h2>
            <div className="flex flex-wrap gap-3">
              {secondary.map((metier) => (
                <Link
                  key={metier.slug}
                  href={`/assurance-decennale/${metier.slug}`}
                  className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-medium text-[#0a0a0a] hover:border-blue-600/30 hover:bg-blue-50 transition-all"
                >
                  {metier.nom}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/devis"
            className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold transition-all"
          >
            Devis decennale
          </Link>
          <Link
            href="/guides/obligation-decennale"
            className="inline-block border-2 border-[#2563eb] text-[#2563eb] px-8 py-4 rounded-2xl hover:bg-[#eff6ff] font-semibold transition-all"
          >
            Guide obligation decennale
          </Link>
        </div>
      </div>
    </main>
  )
}
