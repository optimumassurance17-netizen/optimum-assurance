import Link from "next/link"
import { Header } from "@/components/Header"
import { METIERS_SEO } from "@/lib/metiers-seo"
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
    title: `Assurance Décennale ${data.nom} | Devis dès ${data.prixMin} €/mois | Optimum`,
    description: data.description,
    keywords: [
      `assurance décennale ${data.nom.toLowerCase()}`,
      `décennale ${data.nom.toLowerCase()}`,
      `devis décennale ${data.nom.toLowerCase()}`,
    ],
    alternates: { canonical: `${baseUrl}/assurance-decennale/${data.slug}` },
    openGraph: {
      url: `${baseUrl}/assurance-decennale/${data.slug}`,
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Devis", item: `${baseUrl}/devis` },
      { "@type": "ListItem", position: 3, name: `Décennale ${data.nom}`, item: `${baseUrl}/assurance-decennale/${data.slug}` },
    ],
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="text-sm mb-8">
          <Link href="/" className="text-[#C65D3B] hover:underline">Accueil</Link>
          <span className="text-[#a3a3a3] mx-2">/</span>
          <Link href="/devis" className="text-[#C65D3B] hover:underline">Devis</Link>
          <span className="text-[#a3a3a3] mx-2">/</span>
          <span className="text-[#0a0a0a] font-medium">{data.nom}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
          Assurance décennale {data.nom}
        </h1>
        <p className="text-lg text-[#171717] mb-8 leading-relaxed">
          {data.description}
        </p>

        <div className="bg-[#FEF3F0] border border-[#C65D3B]/30 rounded-2xl p-6 mb-10">
          <p className="font-semibold text-[#0a0a0a] mb-4">Pourquoi choisir Optimum pour votre activité {data.activite} ?</p>
          <ul className="space-y-2 text-[#171717]">
            {data.avantages.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[#C65D3B]">✓</span>
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
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/devis"
            className="inline-block bg-[#C65D3B] text-white px-10 py-4 rounded-2xl hover:bg-[#B04F2F] font-semibold shadow-lg shadow-[#C65D3B]/25 transition-all"
          >
            Devis {data.nom} en 3 minutes
          </Link>
          <p className="text-sm text-[#171717]">
            Dès {data.prixMin} €/mois • Attestation immédiate • Sans engagement
          </p>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="text-[#C65D3B] font-medium hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
