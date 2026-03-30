import Link from "next/link"
import { Header } from "@/components/Header"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { notFound } from "next/navigation"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

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

  return {
    title: `Dommage Ouvrage ${data.nom} | Devis en ligne | Optimum`,
    description: data.description,
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
      title: `Dommage Ouvrage ${data.nom} | Optimum Assurance`,
      description: data.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `Dommage Ouvrage ${data.nom} | Optimum Assurance`,
      description: data.description,
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Dommage ouvrage", item: `${baseUrl}/devis-dommage-ouvrage` },
      { "@type": "ListItem", position: 3, name: data.nom, item: `${baseUrl}/dommage-ouvrage/${data.slug}` },
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
