import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { truncateForDescription } from "@/lib/seo-metadata-utils"
import { SITE_URL } from "@/lib/site-url"
import { notFound } from "next/navigation"

const baseUrl = SITE_URL
const defaultOgImage = { url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }

export async function generateStaticParams() {
  return DO_SEO.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = DO_SEO.find((m) => m.slug === slug)
  if (!data) return {}
  const description = truncateForDescription(data.description, 158)

  return {
    title: `Assurance dommage ouvrage ${data.nom} | Devis & guide | Optimum`,
    description,
    keywords: [
      `dommage ouvrage ${data.nom.toLowerCase()}`,
      `assurance dommage ouvrage ${data.nom.toLowerCase()}`,
      `devis dommage ouvrage`,
    ],
    alternates: { canonical: `${baseUrl}/dommage-ouvrage/${data.slug}` },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "Optimum Assurance",
      url: `${baseUrl}/dommage-ouvrage/${data.slug}`,
      title: `Assurance dommage ouvrage ${data.nom} | Optimum Assurance`,
      description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `Assurance dommage ouvrage ${data.nom} | Optimum Assurance`,
      description,
      images: [`${baseUrl}/opengraph-image`],
    },
  }
}

export default async function DommageOuvragePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = DO_SEO.find((m) => m.slug === slug)
  if (!data) notFound()
  const otherDoPages = DO_SEO.filter((m) => m.slug !== data.slug)

  const path = `/dommage-ouvrage/${data.slug}`
  const jsonLd = seoJsonLdGraph([
    seoBreadcrumbListNode([
      { name: "Accueil", path: "/" },
      { name: "Dommage ouvrage", path: "/devis-dommage-ouvrage" },
      { name: data.nom, path },
    ]),
    seoWebPageNode({
      path,
      name: `Assurance dommage ouvrage ${data.nom}`,
      description: data.description,
    }),
    seoFaqPageNode(data.faq),
  ])

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id={`jsonld-do-${data.slug}`} data={jsonLd} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="text-sm mb-8">
          <Link href="/" className="text-[#2563eb] hover:underline">Accueil</Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href="/devis-dommage-ouvrage" className="text-[#2563eb] hover:underline">Dommage ouvrage</Link>
          <span className="text-[#333333] mx-2">/</span>
          <span className="text-[#0a0a0a] font-medium">{data.nom}</span>
        </nav>

        <span className="inline-block bg-[#eff6ff] text-[#2563eb] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          Dommage ouvrage — Produit principal
        </span>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
          Assurance dommage ouvrage {data.nom}
        </h1>
        <p className="text-lg text-[#171717] mb-8 leading-relaxed">
          {data.description}
        </p>

        <div className="bg-[#eff6ff] border border-[#2563eb]/30 rounded-2xl p-6 mb-10">
          <p className="font-semibold text-[#0a0a0a] mb-4">Pourquoi choisir Optimum ?</p>
          <ul className="space-y-2 text-[#171717]">
            {data.avantages.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[#2563eb]">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Bien préparer votre dossier dommage ouvrage</h2>
          <p className="text-[#171717] text-sm leading-relaxed mb-4">
            Une demande DO est plus fluide si vous préparez dès le départ les informations clés :
            <strong> permis de construire</strong>, coût de l&apos;opération, nature exacte des travaux, acteurs du chantier
            et pièces techniques disponibles. Cela facilite l&apos;étude du risque et évite les retours inutiles avant
            l&apos;émission du devis.
          </p>
          <p className="text-[#171717] text-sm leading-relaxed">
            Selon votre profil, le bon niveau de garantie n&apos;est pas le même : particulier, auto-construction,
            promoteur ou formule clos et couvert. Le choix dépend du budget, des lots réalisés et des intervenants
            déjà assurés en décennale.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Questions fréquentes</h2>
          <div className="space-y-4">
            {data.faq.map((f, i) => (
              <div key={i} className="border-b border-[#e5e5e5] pb-4 last:border-0">
                <p className="font-semibold text-[#0a0a0a] mb-1">{f.q}</p>
                <p className="text-[#171717] text-sm leading-relaxed">{f.r}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#fafafa] rounded-2xl border border-[#e5e5e5] p-6 mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Guides utiles pour votre projet</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/guides/obligation-dommage-ouvrage"
              className="rounded-xl border border-[#e5e5e5] bg-white p-4 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
            >
              <p className="font-semibold text-[#0a0a0a]">Obligation dommage ouvrage</p>
              <p className="mt-1 text-sm text-[#171717]">Qui doit souscrire et à quel moment sur le chantier.</p>
            </Link>
            <Link
              href="/guides/dommage-ouvrage-auto-construction"
              className="rounded-xl border border-[#e5e5e5] bg-white p-4 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
            >
              <p className="font-semibold text-[#0a0a0a]">DO auto-construction</p>
              <p className="mt-1 text-sm text-[#171717]">Documents, étapes et points d&apos;attention pour un particulier.</p>
            </Link>
            <Link
              href="/guides/garantie-clos-couvert"
              className="rounded-xl border border-[#e5e5e5] bg-white p-4 hover:border-[#2563eb]/40 hover:bg-[#eff6ff] transition-all"
            >
              <p className="font-semibold text-[#0a0a0a]">Garantie clos et couvert</p>
              <p className="mt-1 text-sm text-[#171717]">Comprendre les lots couverts pour ajuster la prime.</p>
            </Link>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/devis-dommage-ouvrage"
            className="inline-block bg-[#2563eb] text-white px-10 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold shadow-lg shadow-[#2563eb]/25 transition-all"
          >
            Devis dommage ouvrage
          </Link>
          <p className="text-sm text-[#171717]">
            Devis sous 24h • Auto-construction acceptée • Clos et couvert possible
          </p>
          <p className="text-sm">
            <Link href="/guides/obligation-dommage-ouvrage" className="text-[#2563eb] font-medium hover:underline">
              Comprendre l&apos;obligation dommage ouvrage
            </Link>
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Autres profils dommage ouvrage</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherDoPages.map((doPage) => (
              <Link
                key={doPage.slug}
                href={`/dommage-ouvrage/${doPage.slug}`}
                className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 hover:border-[#2563eb]/30 hover:bg-[#eff6ff] transition-all"
              >
                <p className="font-semibold text-[#0a0a0a]">{doPage.nom}</p>
                <p className="mt-1 text-sm text-[#171717]">{doPage.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="text-[#2563eb] font-medium hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
