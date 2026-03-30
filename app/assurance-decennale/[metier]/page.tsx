import Link from "next/link"
import { Header } from "@/components/Header"
import { METIERS_SEO } from "@/lib/metiers-seo"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { notFound } from "next/navigation"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export async function generateStaticParams() {
  return METIERS_SEO.map((m) => ({ metier: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metier: string }>
}) {
  const { metier } = await params
  const data = METIERS_SEO.find((m) => m.slug === metier)
  if (!data) return {}

  return {
    title: `Assurance Décennale ${data.nom} | Devis dès ${data.prixMin} €/mois (équivalent) | Optimum`,
    description: data.description,
    keywords: [
      `assurance décennale ${data.nom.toLowerCase()}`,
      `décennale ${data.nom.toLowerCase()}`,
      `devis décennale ${data.nom.toLowerCase()}`,
    ],
    alternates: { canonical: `${baseUrl}/assurance-decennale/${data.slug}` },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "Optimum Assurance",
      url: `${baseUrl}/assurance-decennale/${data.slug}`,
      title: `Assurance Décennale ${data.nom} | Optimum Assurance`,
      description: data.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `Assurance Décennale ${data.nom} | Optimum Assurance`,
      description: data.description,
    },
  }
}

export default async function MetierPage({
  params,
}: {
  params: Promise<{ metier: string }>
}) {
  const { metier } = await params
  const data = METIERS_SEO.find((m) => m.slug === metier)
  if (!data) notFound()

  const faqComparatif = {
    q: "En quoi Optimum se distingue des grandes plateformes d’assurance en ligne ?",
    r: "Optimum est centré sur l’assurance construction : décennale et dommage ouvrage, avec des parcours pensés pour les chantiers et les métiers du bâtiment. Les plateformes généralistes proposent souvent un catalogue plus large (RC pro, mutuelle, multirisque…) et une acquisition à très grande échelle ; nous privilégions la lisibilité du devis, le suivi du dossier et une spécialisation sur votre risque.",
  }

  const path = `/assurance-decennale/${data.slug}`
  const metierJsonLd = seoJsonLdGraph([
    seoBreadcrumbListNode([
      { name: "Accueil", path: "/" },
      { name: "Devis décennale", path: "/devis" },
      { name: `Décennale ${data.nom}`, path },
    ]),
    seoWebPageNode({
      path,
      name: `Assurance décennale ${data.nom}`,
      description: data.description,
    }),
    seoFaqPageNode([...data.faq, faqComparatif]),
  ])

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(metierJsonLd) }} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="text-sm mb-8">
          <Link href="/" className="text-blue-600 hover:underline">Accueil</Link>
          <span className="text-[#333333] mx-2">/</span>
          <Link href="/devis" className="text-blue-600 hover:underline">Devis</Link>
          <span className="text-[#333333] mx-2">/</span>
          <span className="text-[#0a0a0a] font-medium">{data.nom}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-3">
          Assurance décennale {data.nom}
        </h1>
        <p className="text-base md:text-lg text-blue-600 font-semibold mb-4">
          Spécialiste construction — pas une plateforme « tout-en-un »
        </p>
        <p className="text-lg text-[#171717] mb-8 leading-relaxed">
          {data.description}
        </p>

        <div className="bg-white rounded-2xl border border-[#e5e5e5] border-l-4 border-l-blue-600 p-6 mb-10 shadow-sm">
          <h2 className="text-lg font-bold text-[#0a0a0a] mb-3">Optimum ou une plateforme généraliste ?</h2>
          <p className="text-[#171717] text-sm leading-relaxed mb-5">
            Les acteurs généralistes mettent souvent le paquet sur le catalogue (RC pro, mutuelle, multirisque…) et la
            rapidité de souscription. Chez Optimum, nous faisons un pari différent :{" "}
            <strong>être excellents sur l’assurance construction</strong> — décennale, suivi de dossier, et dommage{" "}
            ouvrage pour les maîtres d’ouvrage — plutôt que dispersés sur dix produits.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]">
            <table className="w-full text-sm text-left min-w-[280px]">
              <caption className="sr-only">Comparaison Optimum Assurance et plateformes généralistes typiques</caption>
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#e5e5e5]">
                  <th scope="col" className="p-3 font-semibold text-[#0a0a0a] w-[34%]">
                    Critère
                  </th>
                  <th scope="col" className="p-3 font-semibold text-blue-600 w-[33%]">
                    Optimum
                  </th>
                  <th scope="col" className="p-3 font-semibold text-[#525252] w-[33%]">
                    Plateforme généraliste (typique)
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#171717]">
                <tr className="border-b border-[#e5e5e5]">
                  <th scope="row" className="p-3 font-medium text-[#0a0a0a] align-top">
                    Cœur de métier
                  </th>
                  <td className="p-3 align-top">Décennale, dommage ouvrage, contenus par métier</td>
                  <td className="p-3 align-top">Souvent plusieurs branches (santé, RC, flotte, etc.)</td>
                </tr>
                <tr className="border-b border-[#e5e5e5]">
                  <th scope="row" className="p-3 font-medium text-[#0a0a0a] align-top">
                    Promesse
                  </th>
                  <td className="p-3 align-top">Clarté du risque, parcours chantier, espace client</td>
                  <td className="p-3 align-top">Volume, choix de produits, vitesse de souscription</td>
                </tr>
                <tr>
                  <th scope="row" className="p-3 font-medium text-[#0a0a0a] align-top">
                    Pour vous si…
                  </th>
                  <td className="p-3 align-top">Vous voulez un interlocuteur aligné sur le BTP et vos attestations</td>
                  <td className="p-3 align-top">Vous cherchez à tout regrouper chez un même opérateur digital</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#525252] mt-3 text-center">
            Comparaison indicative — non exhaustive. Les offres varient selon les courtiers.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-600/30 rounded-2xl p-6 mb-10">
          <p className="font-semibold text-[#0a0a0a] mb-4">Pourquoi choisir Optimum pour votre activité {data.activite} ?</p>
          <ul className="space-y-2 text-[#171717]">
            {data.avantages.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 mb-10">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-4">Questions fréquentes {data.nom}</h2>
          <div className="space-y-4">
            {data.faq.map((f, i) => (
              <div key={i} className="border-b border-[#e5e5e5] pb-4 last:border-0">
                <p className="font-semibold text-[#0a0a0a] mb-1">{f.q}</p>
                <p className="text-[#171717] text-sm leading-relaxed">{f.r}</p>
              </div>
            ))}
            <div className="pt-4 border-t border-[#e5e5e5]">
              <p className="font-semibold text-[#0a0a0a] mb-1">{faqComparatif.q}</p>
              <p className="text-[#171717] text-sm leading-relaxed">{faqComparatif.r}</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href={`/devis?metier=${encodeURIComponent(data.slug)}`}
            className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl hover:bg-blue-700 font-semibold shadow-lg shadow-[blue-600]/25 transition-all"
          >
            Devis {data.nom} personnalisé
          </Link>
          <p className="text-sm text-[#171717] max-w-lg mx-auto">
            Tarif selon votre CA et vos activités — devis en ligne, sans engagement. Dès {data.prixMin} €/mois
            (équivalent) • Paiement trimestriel • Attestation après validation du dossier
          </p>
          <p className="text-sm">
            <Link href="/devis-dommage-ouvrage" className="text-blue-600 font-medium hover:underline">
              Maître d&apos;ouvrage ? Dommage ouvrage
            </Link>
          </p>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
