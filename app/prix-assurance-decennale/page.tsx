import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ComparisonTable } from "@/components/ComparisonTable"
import { JsonLd } from "@/components/JsonLd"
import {
  EQ_MENSUEL_MIN,
  LEGENDE_PAIEMENT_TRIMESTRIEL,
  PRIME_MIN_ANNUELLE,
} from "@/lib/decennale-affichage-tarif"
import { SITE_URL } from "@/lib/site-url"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = SITE_URL

export const metadata = {
  title: "Prix assurance décennale : tarifs, calcul et exemples | Optimum Assurance",
  description:
    "Comprendre le prix d’une assurance décennale : critères de calcul, prime minimale, paiement trimestriel, exemples BTP et devis en ligne.",
  alternates: { canonical: `${baseUrl}/prix-assurance-decennale` },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    url: `${baseUrl}/prix-assurance-decennale`,
    title: "Prix assurance décennale : tarifs et critères",
    description:
      "Guide clair pour comprendre le prix d’une assurance décennale BTP et préparer un devis.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

const rows = [
  {
    sujet: "Activité exercée",
    left: "Plomberie, électricité, peinture ou second œuvre simple : prime souvent plus basse.",
    right: "Gros œuvre, toiture, étanchéité, structure ou activités spécialisées : analyse plus stricte.",
  },
  {
    sujet: "Chiffre d’affaires",
    left: "Plus le CA déclaré est faible, plus la prime d’entrée peut rester proche du minimum.",
    right: "Un CA élevé augmente l’exposition et donc la cotisation annuelle.",
  },
  {
    sujet: "Historique",
    left: "Dossier sans sinistre et sans résiliation : lecture plus favorable.",
    right: "Résiliation, impayé ou sinistre récent : surprime ou étude renforcée possible.",
  },
  {
    sujet: "Paiement",
    left: "Affichage souvent en équivalent mensuel pour faciliter la comparaison.",
    right: "Paiement réel trimestriel : premier trimestre par carte, puis SEPA.",
  },
]

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Prix assurance décennale", path: "/prix-assurance-decennale" },
  ]),
  seoWebPageNode({
    path: "/prix-assurance-decennale",
    name: "Prix assurance décennale",
    description:
      "Guide sur le calcul du prix d’une assurance décennale pour les professionnels du BTP.",
  }),
])

export default function PrixAssuranceDecennalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-prix-decennale" data={jsonLd} />
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Prix assurance décennale" }]} />
        <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
          Prix assurance décennale : tarifs, calcul et exemples
        </h1>

        <aside className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">Réponse courte</p>
          <p className="text-base leading-relaxed text-[#0a0a0a]">
            Le prix d’une assurance décennale dépend surtout de l’activité BTP, du chiffre d’affaires, de
            l’historique du dossier et des garanties demandées. Chez Optimum, l’entrée décennale démarre à{" "}
            <strong>{PRIME_MIN_ANNUELLE} €/an</strong>, soit environ <strong>{EQ_MENSUEL_MIN} €/mois</strong> en
            équivalent.
          </p>
        </aside>

        <section className="mb-10 space-y-4 text-[#171717]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">Comment est calculée la prime décennale ?</h2>
          <p>
            La cotisation n’est pas un prix fixe identique pour tous les artisans. Elle dépend du risque porté par
            l’assureur : nature des travaux, volume d’activité, ancienneté, sinistralité, résiliation éventuelle et
            niveau de garantie attendu.
          </p>
          <p>
            Le tarif affiché sur le site est présenté en équivalent mensuel pour faciliter la lecture, mais le paiement
            contractuel reste trimestriel. {LEGENDE_PAIEMENT_TRIMESTRIEL}
          </p>
        </section>

        <ComparisonTable leftTitle="Profil favorable" rightTitle="Profil à étude renforcée" rows={rows} />

        <section className="mt-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold text-[#0a0a0a]">Exemples de lecture du prix</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#171717]">
            <li>Un artisan second œuvre avec CA modéré peut se rapprocher du tarif minimum.</li>
            <li>Une entreprise de gros œuvre ou toiture aura généralement une prime plus élevée.</li>
            <li>Une société résiliée ou avec sinistre doit prévoir une étude plus prudente.</li>
            <li>Les activités exactes déclarées doivent correspondre aux travaux réellement réalisés.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4 text-[#171717]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">Comment obtenir un prix fiable ?</h2>
          <p>
            Le plus sûr est de renseigner le devis avec votre SIRET, votre chiffre d’affaires et vos activités exactes.
            Le devis vous donne une base de lecture, puis les documents contractuels précisent les garanties, exclusions
            et conditions d’effet.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/devis" className="rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]">
            Calculer mon tarif décennale
          </Link>
          <Link href="/documents-assurance-decennale" className="rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff]">
            Voir les documents à préparer
          </Link>
        </div>
      </article>
    </main>
  )
}
