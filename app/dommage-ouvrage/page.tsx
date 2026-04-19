import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import {
  seoBreadcrumbListNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const baseUrl = SITE_URL

export const metadata = {
  title: "Dommage ouvrage | Profils couverts et devis en ligne | Optimum Assurance",
  description: truncateForDescription(
    "Assurance dommage ouvrage : auto-construction, particulier faisant construire, constructeur-promoteur et garantie clos et couvert. Comparez les profils couverts et demandez votre devis.",
    158
  ),
  alternates: { canonical: `${baseUrl}/dommage-ouvrage` },
  openGraph: {
    url: `${baseUrl}/dommage-ouvrage`,
    title: "Dommage ouvrage | Profils couverts et devis en ligne | Optimum Assurance",
    description:
      "Découvrez les profils dommage ouvrage couverts et orientez-vous vers la bonne demande de devis.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dommage ouvrage | Profils couverts | Optimum Assurance",
    description: "Auto-construction, particulier, promoteur, clos et couvert : trouvez le bon profil DO.",
    images: [`${baseUrl}/opengraph-image`],
  },
}

const dommageOuvrageHubJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Dommage ouvrage", path: "/dommage-ouvrage" },
  ]),
  seoWebPageNode({
    path: "/dommage-ouvrage",
    name: "Assurance dommage ouvrage",
    description:
      "Hub dommage ouvrage : profils couverts, explications et accès au devis en ligne.",
  }),
])

export default function DommageOuvrageHubPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-do-hub" data={dommageOuvrageHubJsonLd} />
      <Header />

      <div className="mx-auto max-w-5xl px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Dommage ouvrage" }]} />

        <div className="mb-10">
          <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
            Assurance dommage ouvrage : profils couverts
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-[#171717]">
            Cette page regroupe les principaux profils dommage ouvrage traités sur le site :{" "}
            <strong>auto-construction</strong>, <strong>particulier faisant construire</strong>,{" "}
            <strong>constructeur / promoteur</strong> et formule <strong>clos et couvert</strong>.
            Choisissez la page la plus proche de votre situation pour comprendre le cadre légal,
            les documents à préparer et demander votre devis.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {DO_SEO.map((item) => (
            <Link
              key={item.slug}
              href={`/dommage-ouvrage/${item.slug}`}
              className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm transition-all hover:border-[#2563eb]/30 hover:bg-[#eff6ff] hover:shadow-md"
            >
              <h2 className="mb-2 text-xl font-bold text-[#0a0a0a]">{item.nom}</h2>
              <p className="text-sm leading-relaxed text-[#171717]">{item.description}</p>
              <p className="mt-4 font-medium text-[#2563eb]">Voir cette page →</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-[#0a0a0a]">Comment choisir le bon profil ?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
              <p className="font-semibold text-[#0a0a0a]">Auto-construction / particulier</p>
              <p className="mt-2 text-sm leading-relaxed text-[#171717]">
                Si vous faites construire pour vous-meme ou pour un projet patrimonial, commencez par les
                profils <strong>auto-construction</strong> ou <strong>particulier faisant construire</strong>.
                Vous verrez plus clairement les pieces a reunir, le calendrier de souscription et le
                niveau de garantie utile.
              </p>
            </div>
            <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
              <p className="font-semibold text-[#0a0a0a]">Constructeur / promoteur / clos et couvert</p>
              <p className="mt-2 text-sm leading-relaxed text-[#171717]">
                Si vous portez une operation plus structuree ou si vous cherchez a reduire le perimetre
                de garantie, comparez les pages <strong>constructeur-promoteur</strong> et{" "}
                <strong>clos et couvert</strong> avant de lancer la demande de devis.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6">
          <h2 className="mb-3 text-xl font-bold text-[#0a0a0a]">Démarrer une demande</h2>
          <p className="mb-5 text-sm leading-relaxed text-[#171717]">
            Si votre profil est déjà identifié, vous pouvez passer directement au formulaire de demande
            de devis dommage ouvrage. Si vous hésitez entre plusieurs profils, commencez par la page
            la plus proche de votre projet puis revenez au devis.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/devis-dommage-ouvrage"
              className="inline-flex items-center justify-center rounded-2xl bg-[#2563eb] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1d4ed8]"
            >
              Demander un devis dommage ouvrage
            </Link>
            <Link
              href="/guides/obligation-dommage-ouvrage"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-[#2563eb] px-6 py-3 font-semibold text-[#2563eb] transition-all hover:bg-[#eff6ff]"
            >
              Guide obligation dommage ouvrage
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
