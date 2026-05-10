import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ComparisonTable } from "@/components/ComparisonTable"
import { JsonLd } from "@/components/JsonLd"
import { SITE_URL } from "@/lib/site-url"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = SITE_URL

export const metadata = {
  title: "Dommage ouvrage ou décennale : différences | Optimum Assurance",
  description:
    "Tableau comparatif entre assurance dommage ouvrage et assurance décennale : souscripteur, objectif, durée, paiement, attestation et rôle dans un chantier.",
  alternates: { canonical: `${baseUrl}/comparatifs/dommage-ouvrage-vs-decennale` },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    url: `${baseUrl}/comparatifs/dommage-ouvrage-vs-decennale`,
    title: "Dommage ouvrage ou décennale : quelles différences ?",
    description:
      "Comprendre le rôle de la DO et de la décennale dans un chantier de construction.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

const rows = [
  {
    sujet: "Souscripteur",
    left: "Le maître d’ouvrage : particulier, promoteur, constructeur ou mandataire.",
    right: "Le professionnel du BTP ou constructeur qui intervient sur l’ouvrage.",
  },
  {
    sujet: "Objectif",
    left: "Préfinancer rapidement les réparations relevant de la décennale, sans attendre la recherche de responsabilité.",
    right: "Couvrir la responsabilité du constructeur pour les dommages graves affectant l’ouvrage.",
  },
  {
    sujet: "Moment de souscription",
    left: "Avant le début des travaux, avec les pièces du projet et le coût de construction.",
    right: "Avant intervention ou remise d’offre, avec les activités exactes déclarées.",
  },
  {
    sujet: "Durée",
    left: "Jusqu’à 10 ans après réception de l’ouvrage.",
    right: "Responsabilité de 10 ans après réception pour les travaux couverts.",
  },
  {
    sujet: "Paiement chez Optimum",
    left: "Paiement en une fois par virement bancaire via Mollie après validation du dossier.",
    right: "Premier trimestre par carte bancaire via Mollie, puis prélèvements SEPA trimestriels.",
  },
]

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Comparatifs", path: "/comparatifs/dommage-ouvrage-vs-decennale" },
    { name: "DO vs décennale", path: "/comparatifs/dommage-ouvrage-vs-decennale" },
  ]),
  seoWebPageNode({
    path: "/comparatifs/dommage-ouvrage-vs-decennale",
    name: "Dommage ouvrage ou décennale : quelles différences ?",
    description:
      "Comparatif entre dommage ouvrage et assurance décennale dans un projet de construction.",
  }),
])

export default function DoVsDecennalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-do-vs-decennale" data={jsonLd} />
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "DO vs décennale" }]} />
        <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
          Dommage ouvrage ou décennale : quelles différences ?
        </h1>

        <aside className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">Réponse courte</p>
          <p className="text-base leading-relaxed text-[#0a0a0a]">
            La dommage ouvrage est souscrite par le maître d’ouvrage pour préfinancer les réparations. La décennale est
            souscrite par les entreprises ou constructeurs pour couvrir leur responsabilité pendant 10 ans. Les deux
            assurances sont complémentaires.
          </p>
        </aside>

        <ComparisonTable leftTitle="Dommage ouvrage" rightTitle="Assurance décennale" rows={rows} />

        <section className="mt-10 space-y-4 text-[#171717]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">Pourquoi les deux contrats peuvent être nécessaires ?</h2>
          <p>
            Dans un chantier, la DO sécurise le maître d’ouvrage en accélérant l’indemnisation. La décennale sécurise
            les responsabilités des professionnels qui réalisent les travaux. Un projet peut donc nécessiter une DO côté
            maître d’ouvrage et des attestations décennales côté entreprises.
          </p>
          <p>
            Avant de démarrer les travaux, il faut vérifier les attestations des intervenants, rassembler les pièces
            techniques et clarifier les garanties attendues pour le projet.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/devis-dommage-ouvrage" className="rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]">
            Demander un devis DO
          </Link>
          <Link href="/devis" className="rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff]">
            Obtenir un devis décennale
          </Link>
        </div>
      </article>
    </main>
  )
}
