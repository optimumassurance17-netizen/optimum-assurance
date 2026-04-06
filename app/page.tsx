import type { Metadata } from "next"
import Link from "next/link"
import dynamic from "next/dynamic"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { garantiesDecennale, metiersBtp } from "@/lib/garanties-data"
import { OpenChatbotButton } from "@/components/OpenChatbotButton"
import { buildHomePageJsonLdGraph } from "@/lib/seo-home-jsonld"
import { DelegationLegalLine } from "@/components/premium/DelegationLegalLine"

/** Simulateur en chunk séparé : moins de JS critique sur le fil d’hydratation du hero / LCP (H1). */
const SimulateurPrime = dynamic(
  () => import("@/components/SimulateurPrime").then((m) => m.SimulateurPrime),
  {
    ssr: true,
    loading: () => (
      <div
        className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-900/5 min-h-[300px] animate-pulse"
        aria-hidden
      />
    ),
  }
)

const TrustBar = dynamic(() => import("@/components/premium/TrustBar").then((m) => m.TrustBar), {
  loading: () => <div className="h-14 border-y border-slate-200/80 bg-slate-50/90 animate-pulse" aria-hidden />,
})
const HomeFeatureHighlights = dynamic(
  () => import("@/components/premium/HomeFeatureHighlights").then((m) => m.HomeFeatureHighlights),
  {
    loading: () => (
      <div className="min-h-[320px] max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 bg-slate-50/50 animate-pulse rounded-2xl" aria-hidden />
    ),
  },
)
const HomeHowItWorks = dynamic(
  () => import("@/components/premium/HomeHowItWorks").then((m) => m.HomeHowItWorks),
  {
    loading: () => (
      <div className="min-h-[280px] max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 animate-pulse bg-white rounded-2xl" aria-hidden />
    ),
  },
)
const HomeQrSection = dynamic(
  () => import("@/components/premium/HomeQrSection").then((m) => m.HomeQrSection),
  {
    loading: () => (
      <div className="min-h-[240px] px-4 sm:px-6 md:px-8 py-16 bg-slate-900/20 animate-pulse rounded-2xl" aria-hidden />
    ),
  },
)
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"
import {
  EQ_MENSUEL_MIN,
  EQ_MENSUEL_EXEMPLE_NETTOYAGE_TOITURE,
  EQ_MENSUEL_EXEMPLE_TRADITIONNEL,
  EQ_MENSUEL_EXEMPLE_OPTIMUM,
  EQ_MENSUEL_EXEMPLE_ECONOMIE,
  EXEMPLE_COMPARAISON_ANNUEL_TRADITIONNEL,
  EXEMPLE_COMPARAISON_ANNUEL_OPTIMUM,
  EXEMPLE_COMPARAISON_ECONOMIE_ANNUELLE,
  PRIME_ANNUELLE_EXEMPLE_NETTOYAGE_TOITURE,
  PRIME_TRIMESTRIELLE_EXEMPLE_NETTOYAGE_TOITURE,
  LEGENDE_PAIEMENT_TRIMESTRIEL,
  LEGENDE_PAIEMENT_TRIMESTRIEL_COURT,
  formatEurosFR,
} from "@/lib/decennale-affichage-tarif"

const reviewsUrl = process.env.NEXT_PUBLIC_REVIEWS_URL || "/avis"
const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export const metadata: Metadata = {
  title: {
    absolute:
      "Assurance décennale BTP en ligne | Devis 3 min & attestation | Optimum Assurance",
  },
  description: truncateForDescription(
    `Assurance décennale obligatoire (loi Spinetta) : devis en ligne en quelques minutes, attestation pour artisans et entreprises du BTP. Plomberie, électricité, maçonnerie… Dès ${EQ_MENSUEL_MIN} €/mois équivalent, prélèvement trimestriel. Sans engagement.`,
    158
  ),
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Assurance décennale BTP en ligne | Devis et attestation | Optimum Assurance",
    description: `Devis décennale immédiat, documents conformes, 100 % en ligne. Dès ${EQ_MENSUEL_MIN} €/mois équivalent.`,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance — assurance décennale BTP" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Assurance décennale BTP en ligne | Optimum Assurance",
    description: `Devis en quelques minutes, attestation rapide. Dès ${EQ_MENSUEL_MIN} €/mois équivalent.`,
    images: [`${SITE_URL}/opengraph-image`],
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50/50">
      <JsonLd id="jsonld-home" data={buildHomePageJsonLdGraph()} />
      <Header />

      {/* Obligation légale — bandeau sobre */}
      <section className="relative z-0 bg-slate-900 text-white px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <p className="font-semibold text-sm md:text-base text-center sm:text-left text-slate-100">
            Obligatoire pour tous les professionnels du BTP (loi Spinetta 1978) — sans assurance décennale : jusqu&apos;à
            75 000 € d&apos;amende et 6 mois d&apos;emprisonnement
          </p>
          <Link
            href="/faq"
            className="shrink-0 text-white font-medium text-sm underline underline-offset-2 hover:text-blue-200 transition-colors"
          >
            FAQ
          </Link>
        </div>
      </section>

      {/* Hero premium */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/60" />
        <div className="pointer-events-none absolute -top-32 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative px-4 sm:px-6 md:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div>
              {/* H1 en premier dans le DOM : accélère la détection / peinture LCP sur mobile */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.08] mb-5 text-slate-900">
                Votre assurance décennale en ligne, en quelques minutes
              </h1>
              <div className="mb-5">
                <DelegationLegalLine className="max-w-xl" />
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                  Attestation rapide
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
                  Sans engagement
                </span>
              </div>
              <p className="text-lg md:text-xl text-slate-700 mb-6 max-w-xl leading-relaxed">
                Simple, rapide et sécurisé avec un assureur reconnu. Tarif transparent, parcours guidé, documents
                conformes.
              </p>
              <p className="text-slate-800 mb-2 font-semibold">
                dès {EQ_MENSUEL_MIN} €/mois (équivalent) — plomberie, électricité, peinture…
              </p>
              <p className="mb-10 text-sm text-slate-700 max-w-lg">{LEGENDE_PAIEMENT_TRIMESTRIEL}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/devis"
                  className="inline-flex justify-center items-center rounded-2xl bg-blue-600 px-8 py-4 text-center text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
                >
                  Obtenir mon tarif
                </Link>
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex justify-center items-center rounded-2xl border-2 border-slate-900 px-8 py-4 text-center text-base font-semibold text-slate-900 transition-all hover:bg-slate-900 hover:text-white"
                >
                  Nous contacter
                </a>
              </div>
            </div>

            <div className="relative space-y-6">
              <div className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 rounded-2xl border border-blue-200/80 bg-white/60 shadow-sm lg:block" />
              <div className="pointer-events-none absolute -bottom-4 -left-4 hidden h-16 w-16 rounded-full bg-emerald-400/20 blur-xl lg:block" />
              <SimulateurPrime />
              <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-900/5">
                <span className="mb-4 inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  Attestation immédiate
                </span>
                <p className="mb-1 text-sm font-medium text-slate-700">À partir de</p>
                <p className="mb-1 text-4xl font-bold text-slate-900 md:text-5xl tabular-nums min-h-[1.2em]">
                  {EQ_MENSUEL_MIN} €<span className="text-xl font-semibold text-slate-700">/mois</span>
                </p>
                <p className="mb-2 text-xs text-slate-700">Équivalent (min. 600 €/an)</p>
                <p className="mb-6 text-sm text-slate-700">
                  Plomberie, électricité — attestation dès validation du dossier.
                  <span className="mt-2 block text-xs text-slate-600">{LEGENDE_PAIEMENT_TRIMESTRIEL_COURT}</span>
                </p>
                <Link
                  href="/devis"
                  className="block w-full rounded-2xl bg-blue-600 py-4 text-center font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700"
                >
                  Obtenir ce tarif
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustBar />
      <HomeFeatureHighlights />
      <HomeHowItWorks />
      <HomeQrSection />

      {/* RC Fabriquant — bandeau discret vers la demande à l’étude */}
      <section className="px-4 sm:px-6 md:px-8 py-10 bg-gradient-to-r from-teal-50 via-white to-slate-50 border-y border-teal-100/80" aria-labelledby="rc-fab-section">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 id="rc-fab-section" className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
              Responsabilité civile fabricant
            </h2>
            <p className="text-slate-700 max-w-2xl leading-relaxed">
              Vous fabriquez ou distribuez des biens ? Protégez-vous contre les dommages causés par vos produits après
              leur mise sur le marché. Demande personnalisée, étude par nos équipes.
            </p>
          </div>
          <Link
            href="/devis-rc-fabriquant"
            className="shrink-0 inline-flex justify-center items-center rounded-2xl bg-teal-700 px-8 py-4 text-center text-base font-semibold text-white shadow-md shadow-teal-900/20 transition-all hover:bg-teal-800"
          >
            Faire une demande RC fabriquant
          </Link>
        </div>
      </section>

      {/* Dommage Ouvrage — produit principal, mise en avant égale à décennale */}
      <section className="relative overflow-hidden" aria-labelledby="do-section">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 backdrop-blur-sm">
                  Maîtres d&apos;ouvrage & constructeurs
                </span>
                <h2 id="do-section" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                  Assurance Dommage Ouvrage
                </h2>
                <p className="text-lg text-white/95 mb-6 leading-relaxed max-w-lg">
                  Obligatoire pour les constructeurs et promoteurs. Auto-construction acceptée. Garantie clos et couvert uniquement possible. Devis en ligne sous 24h.
                </p>
                <ul className="space-y-2 text-white/95 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>Particuliers faisant construire</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>Clos et couvert uniquement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>Reprise du passé (sous étude)</span>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    href="/devis-dommage-ouvrage"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl hover:bg-white/95 transition-all font-bold shadow-xl"
                  >
                    Demander mon devis DO
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href="/dommage-ouvrage/auto-construction"
                    className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/30"
                  >
                    Auto-construction
                  </Link>
                  <Link
                    href="/dommage-ouvrage/clos-et-couvert"
                    className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/30"
                  >
                    Clos et couvert
                  </Link>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-10 border border-white/20 shadow-2xl">
                <div className="text-white text-center">
                  <p className="text-sm font-medium text-white/90 mb-1">Devis en ligne</p>
                  <p className="text-4xl md:text-5xl font-bold mb-2">Sous 24h</p>
                  <p className="text-white/90 text-sm mb-6">Prix indicatif immédiat selon le coût de construction</p>
                  <Link
                    href="/devis-dommage-ouvrage"
                    className="block w-full bg-white text-blue-600 py-4 rounded-xl hover:bg-white/95 font-semibold transition-all"
                  >
                    Commencer ma demande
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OBLIGATION + ARGUMENTS */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 text-center">
            Pourquoi l&apos;assurance décennale est obligatoire
          </h2>
          <p className="text-[#171717] text-center max-w-3xl mx-auto mb-14 leading-relaxed">
            Depuis la loi Spinetta (1978), tout professionnel du BTP ayant un contrat direct avec le maître d&apos;ouvrage doit souscrire une assurance décennale. Elle couvre les dommages graves affectant l&apos;ouvrage pendant 10 ans après réception. Sans elle, vous ne pouvez pas exercer légalement ni remettre d&apos;attestation à vos clients.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">⚡</span>
              <h3 className="font-semibold text-slate-900 mb-2">Attestation en 3 min</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Dès validation du paiement. Pas 24h comme ailleurs — immédiat, avec QR code de vérification.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">💰</span>
              <h3 className="font-semibold text-slate-900 mb-2">Prix transparents</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Tarifs compétitifs, dès {EQ_MENSUEL_MIN} €/mois équivalent (min. 600 €/an), prélèvement trimestriel. Jusqu&apos;à 30 % d&apos;économies vs. assureurs traditionnels.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">📋</span>
              <h3 className="font-semibold text-slate-900 mb-2">Devis sans engagement</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Tarif immédiat en ligne. Pas de rappel commercial non sollicité.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">🔄</span>
              <h3 className="font-semibold text-slate-900 mb-2">Prélèvement flexible</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Prélèvement trimestriel SEPA (1er trimestre par carte + frais). Régularisation par carte bancaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Différenciation produit / conversion — transparence */}
      <section
        className="px-4 sm:px-6 md:px-8 py-16 bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white"
        aria-labelledby="edge-title"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Expérience &amp; performance</p>
            <h2 id="edge-title" className="text-2xl md:text-3xl font-bold text-white mb-3">
              Un site construit pour la confiance et la conversion
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">
              « Le meilleur » se prouve sur la durée (trafic, dossiers clos, satisfaction). Voici ce que nous mettons
              concrètement de votre côté — technique, pédagogie et parcours d&apos;achat.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                t: "Spécialiste construction",
                d: "Décennale et dommage ouvrage au cœur du produit — pas une marketplace assurance généraliste.",
              },
              {
                t: "Parcours complet",
                d: "Devis, souscription, paiement sécurisé et espace client : une chaîne digitale maîtrisée de bout en bout.",
              },
              {
                t: "SEO & données structurées",
                d: "Schema.org (agence, FAQ, fil d’Ariane), pages métiers et contenus guides pour capter l’intention de recherche.",
              },
              {
                t: "Accessibilité",
                d: "Lien d’évitement, contrastes, focus clavier : base saine pour tous vos visiteurs et pour Google.",
              },
              {
                t: "Transparence des garanties",
                d: "Tableau des garanties, FAQ, CGV : moins de friction, plus de décisions éclairées.",
              },
              {
                t: "Mobile d’abord",
                d: "Barre d’action fixe sur smartphone : devis décennale et DO à portée de pouce.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
              >
                <h3 className="font-semibold text-white mb-2 text-sm md:text-base">{item.t}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-xs mt-10 max-w-2xl mx-auto">
            La performance commerciale dépend aussi de votre acquisition (SEO, pub, bouche-à-oreille) et de la qualité du
            service humain derrière le site — nous continuons d’itérer sur le produit.
          </p>
        </div>
      </section>

      {/* MÉTIERS BTP — icônes */}
      <section className="px-4 sm:px-6 md:px-8 py-16 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 text-center">
            Plus de 100 métiers couverts
          </h2>
          <p className="text-[#171717] text-center mb-10 max-w-xl mx-auto text-sm">
            Plomberie, électricité, peinture, maçonnerie… Un devis adapté à votre activité.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {metiersBtp.map((m) => (
              <Link
                key={m.label}
                href={m.href}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all text-sm font-medium text-slate-900"
              >
                <span className="text-lg">{m.icon}</span>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ASSURANCE DÉCENNALE - focus principal */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 text-center">
            Assurance décennale BTP — Notre spécialité
          </h2>
          <p className="text-[#171717] text-center mb-14 max-w-2xl mx-auto leading-relaxed">
            Artisans, entrepreneurs, architectes, maîtres d&apos;œuvre : l&apos;attestation décennale est exigée sur chaque devis et facture. Optimum vous propose des tarifs adaptés à votre activité.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-blue-600/30 transition-all group">
              <h3 className="font-semibold text-slate-900 mb-2">Gros œuvre</h3>
              <p className="text-[#171717] text-sm mb-4">Maçonnerie, charpente, couverture, terrassement…</p>
              <p className="text-blue-600 font-semibold mb-4">Tarif sur devis</p>
              <Link href="/devis" className="text-blue-600 font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-blue-600/30 transition-all group">
              <h3 className="font-semibold text-slate-900 mb-2">Second œuvre</h3>
              <p className="text-[#171717] text-sm mb-4">Plomberie, électricité, menuiserie, peinture…</p>
              <p className="text-blue-600 font-semibold mb-4">Tarif sur devis</p>
              <Link href="/devis" className="text-blue-600 font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-blue-600/30 transition-all group">
              <h3 className="font-semibold text-slate-900 mb-2">BET & intellectuels</h3>
              <p className="text-[#171717] text-sm mb-4">Architectes, bureaux d&apos;études, géomètres…</p>
              <p className="text-blue-600 font-semibold mb-4">
                dès {EQ_MENSUEL_MIN} €/mois <span className="text-[#171717] font-normal text-sm">(soit 600 €/an)</span>
              </p>
              <Link href="/devis" className="text-blue-600 font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-600/40 shadow-lg shadow-blue-600/10 transition-all group">
              <span className="inline-block bg-blue-50 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">Offre dédiée</span>
              <h3 className="font-semibold text-slate-900 mb-2">Nettoyage toiture & peinture résine</h3>
              <p className="text-[#171717] text-sm mb-4">Activités I3 à I5. Sociétés résiliées acceptées.</p>
              <p className="text-blue-600 font-semibold mb-4">
                dès {formatEurosFR(EQ_MENSUEL_EXEMPLE_NETTOYAGE_TOITURE, { minFrac: 2, maxFrac: 2 })} €/mois{" "}
                <span className="text-[#171717] font-normal text-sm block mt-1">
                  ({formatEurosFR(PRIME_ANNUELLE_EXEMPLE_NETTOYAGE_TOITURE)} €/an, soit{" "}
                  {formatEurosFR(PRIME_TRIMESTRIELLE_EXEMPLE_NETTOYAGE_TOITURE)} €/trimestre prélevé)
                </span>
              </p>
              <Link href="/devis" className="text-blue-600 font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-600/40 shadow-lg shadow-blue-600/10 transition-all group">
              <span className="inline-block bg-blue-50 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">Maître d&apos;ouvrage</span>
              <h3 className="font-semibold text-slate-900 mb-2">Dommage ouvrage</h3>
              <p className="text-[#171717] text-sm mb-3">Assurance obligatoire pour constructeurs et promoteurs. Auto-construction acceptée. Clos et couvert uniquement possible.</p>
              <p className="text-blue-600 font-semibold mb-4">Devis en ligne</p>
              <Link href="/devis-dommage-ouvrage" className="text-blue-600 font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* OFFRE DÉCOUVERTE + JEUNES ENTREPRISES */}
      <section className="px-4 sm:px-6 md:px-8 py-16 bg-gradient-to-r from-slate-50 to-blue-50/50 border-y border-slate-200/90">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Offre découverte</span>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Devis gratuit et sans engagement</h2>
          <p className="text-[#171717] mb-4 max-w-xl mx-auto">Obtenez votre tarification en 3 minutes. Aucun engagement, pas de rappel commercial non sollicité.</p>
          <p className="text-sm text-blue-600 font-semibold mb-8">
            Entreprise de moins de 6 mois ? Tarifs adaptés pour votre lancement.
          </p>
          <Link href="/devis" className="inline-block bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5">
            Devis sans engagement
          </Link>
        </div>
      </section>

      {/* COMPARATEUR DE PRIX */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 text-center">Comparez et économisez</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[var(--background)] rounded-2xl p-6 border border-[#e5e5e5] text-center">
              <p className="text-[#171717] text-sm font-medium mb-1">Assureurs traditionnels</p>
              <p className="text-2xl font-bold text-[#171717] line-through">
                ~{formatEurosFR(EQ_MENSUEL_EXEMPLE_TRADITIONNEL)} €/mois
              </p>
              <p className="text-sm text-[#171717] mt-2">
                Pour un CA de 80 000 €, plomberie (~{formatEurosFR(EXEMPLE_COMPARAISON_ANNUEL_TRADITIONNEL)} €/an équivalent)
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-600 text-center shadow-xl shadow-blue-600/15">
              <p className="text-blue-600 text-sm font-semibold mb-1">Optimum Assurance</p>
              <p className="text-3xl font-bold text-blue-600">~{formatEurosFR(EQ_MENSUEL_EXEMPLE_OPTIMUM)} €/mois</p>
              <p className="text-sm text-[#171717] mt-2">
                Même profil (~{formatEurosFR(EXEMPLE_COMPARAISON_ANNUEL_OPTIMUM)} €/an) — jusqu&apos;à 30 % d&apos;économies · prélèvement trimestriel
              </p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center">
              <p className="text-emerald-900 text-sm font-semibold mb-1">Votre économie</p>
              <p className="text-2xl font-bold text-emerald-800">~{formatEurosFR(EQ_MENSUEL_EXEMPLE_ECONOMIE)} €/mois</p>
              <p className="text-sm text-emerald-800 mt-2">
                À réinvestir (~{formatEurosFR(EXEMPLE_COMPARAISON_ECONOMIE_ANNUELLE)} €/an)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TABLEAU DES GARANTIES */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 text-center">
            Garanties incluses dans votre contrat
          </h2>
          <p className="text-[#171717] text-center mb-12 text-sm">
            Transparence totale — pas de frais cachés
          </p>
          <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 sm:mx-0 sm:px-0 rounded-xl border border-slate-200/90 bg-white shadow-sm touch-pan-x">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-blue-600">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Garantie</th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-900 hidden sm:table-cell">Description</th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Franchise</th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Plafond</th>
                </tr>
              </thead>
              <tbody>
                {garantiesDecennale.map((g, i) => (
                  <tr key={i} className="border-b border-[#e5e5e5] hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-900">{g.nom}</td>
                    <td className="py-4 px-4 text-[#171717] hidden sm:table-cell">{g.description}</td>
                    <td className="py-4 px-4 text-[#171717]">{g.franchise}</td>
                    <td className="py-4 px-4 text-[#171717]">{g.plafond}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#171717] mt-6 text-center">
            Détails complets dans les Conditions Générales de votre contrat.
          </p>
        </div>
      </section>

      {/* TÉMOIGNAGES + NOTE */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-[var(--background)] border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-4xl font-bold text-slate-900 mb-1">4,9</p>
            <p className="text-[#171717] text-sm mb-2">/5 — Avis clients</p>
            <Link href={reviewsUrl} className="inline-block text-blue-600 font-semibold text-sm hover:underline">
              Voir tous nos avis →
            </Link>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 text-center">Ils nous font confiance</h2>
          <p className="text-[#171717] text-center mb-10 max-w-2xl mx-auto">
            Une assurance simple, rapide et sans surprise. Attestation immédiate — pas d&apos;attente 24h.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;Attestation reçue en 5 minutes. Tarif imbattable par rapport à mon ancien assureur.&quot;</p>
              <p className="font-semibold text-slate-900">P. M., Plombier</p>
              <p className="text-sm text-[#171717]">Lyon</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;Société résiliée pour impayé, Optimum m&apos;a accepté. Souscription simple et rapide.&quot;</p>
              <p className="font-semibold text-slate-900">J. L., Électricien</p>
              <p className="text-sm text-[#171717]">Toulouse</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;BET structure : 600 €/an contre 900 € ailleurs. Le QR code sur l&apos;attestation rassure mes clients.&quot;</p>
              <p className="font-semibold text-slate-900">M. D., Bureau d&apos;études</p>
              <p className="text-sm text-[#171717]">Paris</p>
            </div>
          </div>
        </div>
      </section>

      {/* GUIDES PRATIQUES */}
      <section className="px-4 sm:px-6 md:px-8 py-16 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Guides décennale et dommage ouvrage</h2>
          <p className="text-[#171717] text-center mb-8 max-w-xl mx-auto">
            Obligation, résiliation, sinistre, auto-construction, clos et couvert.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/guides/obligation-decennale" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">L&apos;obligation décennale</p>
              <p className="text-sm text-[#171717] mt-1">Loi Spinetta, sanctions, qui doit souscrire</p>
            </Link>
            <Link href="/guides/resiliation-decennale" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">Résilier sa décennale</p>
              <p className="text-sm text-[#171717] mt-1">Délais, lettre recommandée, changement d&apos;assureur</p>
            </Link>
            <Link href="/guides/declaration-sinistre" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">Déclarer un sinistre</p>
              <p className="text-sm text-[#171717] mt-1">Procédure, délais, documents à fournir</p>
            </Link>
            <Link href="/guides/obligation-dommage-ouvrage" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">Obligation dommage ouvrage</p>
              <p className="text-sm text-[#171717] mt-1">Maîtres d&apos;ouvrage, constructeurs, promoteurs</p>
            </Link>
            <Link href="/guides/dommage-ouvrage-auto-construction" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">DO auto-construction</p>
              <p className="text-sm text-[#171717] mt-1">Particulier qui fait construire sa maison</p>
            </Link>
            <Link href="/guides/garantie-clos-couvert" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <p className="font-semibold text-slate-900 group-hover:text-blue-600">Garantie clos et couvert</p>
              <p className="text-sm text-[#171717] mt-1">Définition, lots couverts, avantages</p>
            </Link>
          </div>
          <p className="text-center mt-6">
            <Link href="/guides" className="text-blue-600 font-semibold hover:underline">Voir tous les guides →</Link>
          </p>
        </div>
      </section>

      {/* PARTENAIRES TECHNIQUES */}
      <section className="px-4 sm:px-6 md:px-8 py-16 bg-[var(--background)] border-y border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Partenaires de confiance</h2>
          <p className="text-[#171717] text-sm mb-8">Paiement sécurisé et signature électronique sur document</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            <div className="px-6 py-3 bg-white rounded-xl border border-[#e5e5e5] font-semibold text-slate-900">Mollie</div>
            <div className="px-6 py-3 bg-white rounded-xl border border-[#e5e5e5] font-semibold text-slate-900">Signature en ligne</div>
          </div>
        </div>
      </section>

      {/* PARTENARIATS */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Partenariats professionnels</h2>
          <p className="text-[#171717] mb-8 leading-relaxed">
            Optimum Assurance travaille avec les syndicats, fédérations du BTP et plateformes de mise en relation pour offrir des tarifs préférentiels à leurs adhérents.
          </p>
          <p className="text-sm text-[#171717]">
            Vous représentez une organisation ? <Link href="/devis" className="text-blue-600 font-semibold hover:underline">Contactez-nous</Link> pour discuter d&apos;un partenariat.
          </p>
        </div>
      </section>

      {/* CONTACT — Comment pouvons-nous vous aider ? */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 text-center">
            Comment pouvons-nous vous aider ?
          </h2>
          <p className="text-[#171717] text-center mb-12">
            Notre équipe vous accompagne à chaque étape. Un sinistre ? Pas de panique.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <OpenChatbotButton />
            <Link href="/contact" className="flex flex-col items-center p-6 bg-[var(--background)] rounded-2xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <span className="text-3xl mb-3">✉️</span>
              <p className="font-semibold text-slate-900">Formulaire</p>
              <p className="text-sm text-[#171717] mt-1">Réponse sous 24h</p>
              <p className="text-xs text-blue-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Nous contacter</p>
            </Link>
            <Link href="/faq#sinistre" className="flex flex-col items-center p-6 bg-[var(--background)] rounded-2xl border border-[#e5e5e5] hover:border-blue-600/40 hover:bg-blue-50 transition-all group">
              <span className="text-3xl mb-3">⚠️</span>
              <p className="font-semibold text-slate-900">Sinistre</p>
              <p className="text-sm text-[#171717] mt-1">Déclaration rapide</p>
              <p className="text-xs text-blue-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Comment déclarer</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 md:px-8 py-20 bg-[var(--background)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">
            Conformité légale et meilleur prix — protégez votre activité dès aujourd&apos;hui
          </h2>
          <Link
            href="/devis"
            className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-600/25 hover:-translate-y-0.5"
          >
            Mon devis en 3 minutes
          </Link>
        </div>
      </section>
    </main>
  )
}
