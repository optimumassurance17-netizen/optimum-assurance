import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ComparisonTable } from "@/components/ComparisonTable"
import { JsonLd } from "@/components/JsonLd"
import { SITE_URL } from "@/lib/site-url"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = SITE_URL

export const metadata = {
  title: "Décennale ou RC Pro : quelles différences ? | Optimum Assurance",
  description:
    "Comparatif clair entre assurance décennale et RC Pro : obligation, durée, risques couverts, attestation, prix et cas d’usage pour les professionnels du BTP.",
  alternates: { canonical: `${baseUrl}/comparatifs/decennale-vs-rc-pro` },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    url: `${baseUrl}/comparatifs/decennale-vs-rc-pro`,
    title: "Décennale ou RC Pro : quelles différences ?",
    description:
      "Tableau comparatif pour comprendre ce que couvre la décennale et ce que couvre la RC Pro dans le BTP.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

const rows = [
  {
    sujet: "Objectif",
    left: "Couvrir la responsabilité décennale du constructeur pendant 10 ans après réception.",
    right: "Couvrir certains dommages causés aux tiers dans l’exercice de l’activité professionnelle.",
  },
  {
    sujet: "Obligation BTP",
    left: "Obligatoire pour les professionnels soumis à la loi Spinetta et intervenant directement sur l’ouvrage.",
    right: "Souvent indispensable contractuellement, mais ne remplace pas la décennale obligatoire.",
  },
  {
    sujet: "Durée de couverture",
    left: "10 ans après réception des travaux pour les dommages relevant des articles 1792 et suivants du Code civil.",
    right: "Selon le contrat, principalement pour les dommages liés à l’activité professionnelle hors responsabilité décennale.",
  },
  {
    sujet: "Exemple de sinistre",
    left: "Fissures graves, défaut d’étanchéité, impropriété à destination, atteinte à la solidité.",
    right: "Dommage matériel ou corporel causé à un tiers pendant l’activité, selon garanties souscrites.",
  },
  {
    sujet: "Document remis",
    left: "Attestation décennale demandée avant chantier, souvent jointe aux devis et factures.",
    right: "Attestation RC Pro utile pour rassurer clients et donneurs d’ordre, mais différente.",
  },
]

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Comparatifs", path: "/comparatifs/decennale-vs-rc-pro" },
    { name: "Décennale vs RC Pro", path: "/comparatifs/decennale-vs-rc-pro" },
  ]),
  seoWebPageNode({
    path: "/comparatifs/decennale-vs-rc-pro",
    name: "Décennale ou RC Pro : quelles différences ?",
    description:
      "Comparatif entre assurance décennale et RC Pro pour les professionnels du BTP.",
  }),
])

export default function DecennaleVsRcProPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-decennale-vs-rc-pro" data={jsonLd} />
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Décennale vs RC Pro" }]} />
        <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
          Décennale ou RC Pro : quelles différences ?
        </h1>

        <aside className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">Réponse courte</p>
          <p className="text-base leading-relaxed text-[#0a0a0a]">
            La décennale couvre pendant 10 ans les dommages graves affectant l’ouvrage. La RC Pro couvre d’autres
            dommages causés aux tiers dans l’activité professionnelle. Pour un professionnel du BTP, la RC Pro ne
            remplace pas l’assurance décennale obligatoire.
          </p>
        </aside>

        <ComparisonTable leftTitle="Assurance décennale" rightTitle="RC Pro" rows={rows} />

        <section className="mt-10 space-y-4 text-[#171717]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">Quelle assurance choisir quand on travaille dans le BTP ?</h2>
          <p>
            Si vos travaux relèvent de la responsabilité décennale, l’attestation décennale doit être obtenue avant de
            démarrer le chantier. La RC Pro peut compléter la couverture, mais elle n’efface pas l’obligation liée à la
            loi Spinetta.
          </p>
          <p>
            Le bon contrat dépend des activités réellement exercées, du chiffre d’affaires, de la sinistralité et des
            exigences des maîtres d’ouvrage ou donneurs d’ordre.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/devis" className="rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]">
            Obtenir un devis décennale
          </Link>
          <Link href="/guides/obligation-decennale" className="rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff]">
            Lire le guide obligation décennale
          </Link>
        </div>
      </article>
    </main>
  )
}
