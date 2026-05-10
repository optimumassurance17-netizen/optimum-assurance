import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ComparisonTable } from "@/components/ComparisonTable"
import { JsonLd } from "@/components/JsonLd"
import { SITE_URL } from "@/lib/site-url"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = SITE_URL

export const metadata = {
  title: "Documents pour assurance décennale : liste et conseils | Optimum Assurance",
  description:
    "Liste des documents à préparer pour souscrire une assurance décennale : SIRET, KBIS, pièce d’identité, justificatifs, sinistralité et reprise du passé.",
  alternates: { canonical: `${baseUrl}/documents-assurance-decennale` },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    url: `${baseUrl}/documents-assurance-decennale`,
    title: "Documents nécessaires pour une assurance décennale",
    description:
      "Checklist claire pour préparer un dossier décennale avant devis, signature et attestation.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

const rows = [
  {
    sujet: "Identité entreprise",
    left: "SIRET, raison sociale, adresse, email, téléphone.",
    right: "Permet d’identifier le souscripteur et de préremplir le dossier.",
  },
  {
    sujet: "Représentant légal",
    left: "Nom, civilité, pièce d’identité si demandée.",
    right: "Nécessaire pour la signature électronique et le suivi contractuel.",
  },
  {
    sujet: "Activités BTP",
    left: "Liste précise des travaux réalisés, lots, exclusions éventuelles.",
    right: "Conditionne les garanties, exclusions et le libellé de l’attestation.",
  },
  {
    sujet: "Chiffre d’affaires",
    left: "CA annuel déclaré ou prévisionnel.",
    right: "Base de calcul de la prime et de la régularisation future.",
  },
  {
    sujet: "Sinistralité",
    left: "Relevé de sinistralité ou attestation de non-sinistralité selon le cas.",
    right: "Important en reprise du passé, résiliation ou dossier déjà assuré.",
  },
]

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Documents assurance décennale", path: "/documents-assurance-decennale" },
  ]),
  seoWebPageNode({
    path: "/documents-assurance-decennale",
    name: "Documents pour assurance décennale",
    description:
      "Checklist des pièces à préparer pour souscrire une assurance décennale BTP.",
  }),
])

export default function DocumentsAssuranceDecennalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-documents-decennale" data={jsonLd} />
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Documents assurance décennale" }]} />
        <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
          Documents pour assurance décennale : liste et conseils
        </h1>

        <aside className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">Réponse courte</p>
          <p className="text-base leading-relaxed text-[#0a0a0a]">
            Pour préparer une assurance décennale, prévoyez au minimum votre SIRET, les informations de l’entreprise,
            les activités exactes, le chiffre d’affaires et les pièces demandées selon votre situation : KBIS, identité,
            relevé de sinistralité ou attestation de non-sinistralité.
          </p>
        </aside>

        <ComparisonTable leftTitle="À préparer" rightTitle="Pourquoi c’est utile" rows={rows} />

        <section className="mt-10 space-y-4 text-[#171717]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">Pourquoi ces documents sont demandés ?</h2>
          <p>
            L’assurance décennale couvre des risques longs et importants. L’assureur doit donc comprendre qui souscrit,
            quels travaux sont réellement effectués, quel chiffre d’affaires est déclaré et si le dossier présente des
            antécédents particuliers.
          </p>
          <p>
            Plus les informations sont précises, plus le devis, le contrat et l’attestation sont cohérents avec la
            réalité du chantier.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold text-[#0a0a0a]">Cas particuliers</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#171717]">
            <li>Société résiliée : un relevé de sinistralité ou des informations complémentaires peuvent être demandés.</li>
            <li>Reprise du passé : une attestation de non-sinistralité peut être nécessaire.</li>
            <li>Entreprise récente : la date de création et le prévisionnel peuvent être utiles.</li>
            <li>Activités multiples : chaque lot réellement exercé doit être déclaré.</li>
          </ul>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/devis" className="rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]">
            Commencer mon devis
          </Link>
          <Link href="/prix-assurance-decennale" className="rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff]">
            Comprendre le prix
          </Link>
        </div>
      </article>
    </main>
  )
}
