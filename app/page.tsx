import Link from "next/link"
import { Header } from "@/components/Header"
import { SimulateurPrime } from "@/components/SimulateurPrime"
import { garantiesDecennale, metiersBtp } from "@/lib/garanties-data"
import { OpenChatbotButton } from "@/components/OpenChatbotButton"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"
const reviewsUrl = process.env.NEXT_PUBLIC_REVIEWS_URL || "/avis"
const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "InsuranceAgency",
  "@id": `${baseUrl}/#organization`,
  name: "Optimum Assurance",
  description: "Assurance décennale BTP en ligne. Devis en 3 minutes, attestation immédiate. Plombier, électricien, peintre, maçon. Tarifs dès 70 €/mois.",
  url: baseUrl,
  areaServed: { "@type": "Country", name: "FR" },
  priceRange: "€€",
  serviceType: ["Assurance décennale professionnelle", "Assurance dommage ouvrage"],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    bestRating: "5",
    ratingCount: "50",
    worstRating: "1",
  },
}

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  name: "Optimum Assurance",
  url: baseUrl,
  publisher: { "@id": `${baseUrl}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", url: `${baseUrl}/devis` },
    "query-input": "required name=search_term_string",
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      <Header />

      {/* OBLIGATION - bandeau d'urgence */}
      <section className="relative z-0 bg-[#C65D3B] text-white px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <p className="font-semibold text-sm md:text-base text-center sm:text-left">
            Obligatoire pour tous les professionnels du BTP (loi Spinetta 1978) — Sans assurance décennale : jusqu&apos;à 75 000 € d&apos;amende et 6 mois d&apos;emprisonnement
          </p>
          <Link
            href="/faq"
            className="shrink-0 text-white font-medium text-sm underline underline-offset-2 hover:no-underline"
          >
            FAQ
          </Link>
        </div>
      </section>

      {/* HERO - gradient, impactant */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEF3F0] via-[#FAFAF9] to-[#F5F5F4]" />
        <div className="relative px-6 md:px-8 py-20 md:py-32">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Attestation immédiate — pas 24h
                </span>
                <span className="inline-block bg-[#0a0a0a] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Sans engagement
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mb-6 text-[#0a0a0a]">
                Assurance décennale BTP : devis en 3 min, attestation immédiate
              </h1>
              <p className="text-lg md:text-xl text-[#171717] mb-6 max-w-lg leading-relaxed">
                Obligatoire pour exercer dans le BTP, l&apos;assurance décennale protège vos chantiers pendant 10 ans. Chez Optimum, attestation disponible dès validation du paiement — pas d&apos;attente 24h.
              </p>
              <p className="text-[#171717] mb-10 font-medium">
                dès 70 €/mois — plomberie, électricité, peinture…
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/devis"
                  className="bg-[#C65D3B] text-white px-7 py-4 rounded-2xl hover:bg-[#B04F2F] transition-all font-semibold text-center shadow-lg shadow-[#C65D3B]/25 hover:shadow-xl hover:shadow-[#C65D3B]/30 hover:-translate-y-0.5"
                >
                  Mon devis en 3 minutes
                </Link>
                <a
                  href={`mailto:${contactEmail}`}
                  className="border-2 border-[#0a0a0a] px-7 py-4 rounded-2xl hover:bg-[#0a0a0a] hover:text-white transition-all text-[#0a0a0a] font-semibold text-center"
                >
                  Nous contacter
                </a>
              </div>
            </div>

            {/* CARD + SIMULATEUR */}
            <div className="relative space-y-6">
              <SimulateurPrime />
              <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-[#e5e5e5] p-8">
                <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">Attestation immédiate</span>
                <p className="text-[#171717] mb-1 font-medium text-sm">À partir de</p>
                <p className="text-4xl md:text-5xl font-bold text-[#0a0a0a] mb-1">70 €<span className="text-xl font-normal text-[#171717]">/mois</span></p>
                <p className="text-[#171717] mb-6 text-sm">Plomberie, électricité — attestation dès paiement, pas d&apos;attente 24h</p>
                <Link
                  href="/devis"
                  className="block w-full bg-[#C65D3B] text-white py-4 rounded-2xl hover:bg-[#B04F2F] transition-all text-center font-semibold shadow-md shadow-[#C65D3B]/20"
                >
                  Obtenir ce tarif
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dommage Ouvrage — produit principal, mise en avant égale à décennale */}
      <section className="relative overflow-hidden" aria-labelledby="do-section">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C65D3B] via-[#D96B4A] to-[#C65D3B]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative px-6 md:px-8 py-16 md:py-20">
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
                    className="inline-flex items-center gap-2 bg-white text-[#C65D3B] px-8 py-4 rounded-2xl hover:bg-white/95 transition-all font-bold shadow-xl"
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
                    className="block w-full bg-white text-[#C65D3B] py-4 rounded-xl hover:bg-white/95 font-semibold transition-all"
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
      <section className="px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-6 text-center">
            Pourquoi l&apos;assurance décennale est obligatoire
          </h2>
          <p className="text-[#171717] text-center max-w-3xl mx-auto mb-14 leading-relaxed">
            Depuis la loi Spinetta (1978), tout professionnel du BTP ayant un contrat direct avec le maître d&apos;ouvrage doit souscrire une assurance décennale. Elle couvre les dommages graves affectant l&apos;ouvrage pendant 10 ans après réception. Sans elle, vous ne pouvez pas exercer légalement ni remettre d&apos;attestation à vos clients.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">⚡</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Attestation en 3 min</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Dès validation du paiement. Pas 24h comme ailleurs — immédiat, avec QR code de vérification.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">💰</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Prix transparents</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Tarifs compétitifs, dès 70 €/mois. Jusqu&apos;à 30 % d&apos;économies vs. assureurs traditionnels.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">📋</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Devis sans engagement</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Tarif immédiat en ligne. Pas de rappel commercial non sollicité.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md hover:border-[#d4d4d4] transition-all">
              <span className="text-2xl mb-2 block">🔄</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Prélèvement flexible</h3>
              <p className="text-[#171717] text-sm leading-relaxed">
                Mensuel ou trimestriel SEPA. Régularisation par carte bancaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MÉTIERS BTP — icônes */}
      <section className="px-6 md:px-8 py-16 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-[#0a0a0a] mb-2 text-center">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all text-sm font-medium text-[#0a0a0a]"
              >
                <span className="text-lg">{m.icon}</span>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ASSURANCE DÉCENNALE - focus principal */}
      <section className="px-6 md:px-8 py-20 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-4 text-center">
            Assurance décennale BTP — Notre spécialité
          </h2>
          <p className="text-[#171717] text-center mb-14 max-w-2xl mx-auto leading-relaxed">
            Artisans, entrepreneurs, architectes, maîtres d&apos;œuvre : l&apos;attestation décennale est exigée sur chaque devis et facture. Optimum vous propose des tarifs adaptés à votre activité.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-[#C65D3B]/30 transition-all group">
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Gros œuvre</h3>
              <p className="text-[#171717] text-sm mb-4">Maçonnerie, charpente, couverture, terrassement…</p>
              <p className="text-[#C65D3B] font-semibold mb-4">Tarif sur devis</p>
              <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-[#C65D3B]/30 transition-all group">
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Second œuvre</h3>
              <p className="text-[#171717] text-sm mb-4">Plomberie, électricité, menuiserie, peinture…</p>
              <p className="text-[#C65D3B] font-semibold mb-4">Tarif sur devis</p>
              <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-lg hover:border-[#C65D3B]/30 transition-all group">
              <h3 className="font-semibold text-[#0a0a0a] mb-2">BET & intellectuels</h3>
              <p className="text-[#171717] text-sm mb-4">Architectes, bureaux d&apos;études, géomètres…</p>
              <p className="text-[#C65D3B] font-semibold mb-4">dès 600 €/an</p>
              <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-[#C65D3B]/40 shadow-lg shadow-[#C65D3B]/10 transition-all group">
              <span className="inline-block bg-[#FEF3F0] text-[#C65D3B] text-xs font-semibold px-3 py-1.5 rounded-full mb-3">Offre dédiée</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Nettoyage toiture & peinture résine</h3>
              <p className="text-[#171717] text-sm mb-4">Activités I3 à I5. Sociétés résiliées acceptées.</p>
              <p className="text-[#C65D3B] font-semibold mb-4">1 132 €/mois</p>
              <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-[#C65D3B]/40 shadow-lg shadow-[#C65D3B]/10 transition-all group">
              <span className="inline-block bg-[#FEF3F0] text-[#C65D3B] text-xs font-semibold px-3 py-1.5 rounded-full mb-3">Maître d&apos;ouvrage</span>
              <h3 className="font-semibold text-[#0a0a0a] mb-2">Dommage ouvrage</h3>
              <p className="text-[#171717] text-sm mb-3">Assurance obligatoire pour constructeurs et promoteurs. Auto-construction acceptée. Clos et couvert uniquement possible.</p>
              <p className="text-[#C65D3B] font-semibold mb-4">Devis en ligne</p>
              <Link href="/devis-dommage-ouvrage" className="text-[#C65D3B] font-medium hover:underline group-hover:underline">Mon devis →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* OFFRE DÉCOUVERTE + JEUNES ENTREPRISES */}
      <section className="px-6 md:px-8 py-16 bg-gradient-to-r from-[#FEF3F0] to-[#F9F6F0] border-y border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-[#C65D3B] text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Offre découverte</span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-2">Devis gratuit et sans engagement</h2>
          <p className="text-[#171717] mb-4 max-w-xl mx-auto">Obtenez votre tarification en 3 minutes. Aucun engagement, pas de rappel commercial non sollicité.</p>
          <p className="text-sm text-[#C65D3B] font-semibold mb-8">
            Entreprise de moins de 6 mois ? Tarifs adaptés pour votre lancement.
          </p>
          <Link href="/devis" className="inline-block bg-[#C65D3B] text-white px-8 py-4 rounded-2xl hover:bg-[#B04F2F] font-semibold shadow-lg shadow-[#C65D3B]/25 transition-all hover:-translate-y-0.5">
            Essayer gratuitement
          </Link>
        </div>
      </section>

      {/* COMPARATEUR DE PRIX */}
      <section className="px-6 md:px-8 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-6 text-center">Comparez et économisez</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[var(--background)] rounded-2xl p-6 border border-[#e5e5e5] text-center">
              <p className="text-[#171717] text-sm font-medium mb-1">Assureurs traditionnels</p>
              <p className="text-2xl font-bold text-[#171717] line-through">~1 200 €/an</p>
              <p className="text-sm text-[#171717] mt-2">Pour un CA de 80 000 €, plomberie</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-[#C65D3B] text-center shadow-xl shadow-[#C65D3B]/15">
              <p className="text-[#C65D3B] text-sm font-semibold mb-1">Optimum Assurance</p>
              <p className="text-3xl font-bold text-[#C65D3B]">~840 €/an</p>
              <p className="text-sm text-[#171717] mt-2">Même profil — jusqu&apos;à 30 % d&apos;économies</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center">
              <p className="text-emerald-800 text-sm font-semibold mb-1">Votre économie</p>
              <p className="text-2xl font-bold text-emerald-700">~360 €/an</p>
              <p className="text-sm text-emerald-700 mt-2">À réinvestir dans votre activité</p>
            </div>
          </div>
        </div>
      </section>

      {/* TABLEAU DES GARANTIES */}
      <section className="px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-2 text-center">
            Garanties incluses dans votre contrat
          </h2>
          <p className="text-[#171717] text-center mb-12 text-sm">
            Transparence totale — pas de frais cachés
          </p>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-[#C65D3B]">
                  <th className="text-left py-4 px-4 font-semibold text-[#0a0a0a]">Garantie</th>
                  <th className="text-left py-4 px-4 font-semibold text-[#0a0a0a] hidden sm:table-cell">Description</th>
                  <th className="text-left py-4 px-4 font-semibold text-[#0a0a0a]">Franchise</th>
                  <th className="text-left py-4 px-4 font-semibold text-[#0a0a0a]">Plafond</th>
                </tr>
              </thead>
              <tbody>
                {garantiesDecennale.map((g, i) => (
                  <tr key={i} className="border-b border-[#e5e5e5] hover:bg-[#FEF3F0]/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-[#0a0a0a]">{g.nom}</td>
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
      <section className="px-6 md:px-8 py-20 bg-[var(--background)] border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-4xl font-bold text-[#0a0a0a] mb-1">4,9</p>
            <p className="text-[#171717] text-sm mb-2">/5 — Avis clients</p>
            <Link href={reviewsUrl} className="inline-block text-[#C65D3B] font-semibold text-sm hover:underline">
              Voir tous nos avis →
            </Link>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-4 text-center">Ils nous font confiance</h2>
          <p className="text-[#171717] text-center mb-10 max-w-2xl mx-auto">
            Une assurance simple, rapide et sans surprise. Attestation immédiate — pas d&apos;attente 24h.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;Attestation reçue en 5 minutes. Tarif imbattable par rapport à mon ancien assureur.&quot;</p>
              <p className="font-semibold text-[#0a0a0a]">P. M., Plombier</p>
              <p className="text-sm text-[#171717]">Lyon</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;Société résiliée pour impayé, Optimum m&apos;a accepté. Souscription simple et rapide.&quot;</p>
              <p className="font-semibold text-[#0a0a0a]">J. L., Électricien</p>
              <p className="text-sm text-[#171717]">Toulouse</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all">
              <p className="text-[#171717] text-sm italic mb-4 leading-relaxed">&quot;BET structure : 600 €/an contre 900 € ailleurs. Le QR code sur l&apos;attestation rassure mes clients.&quot;</p>
              <p className="font-semibold text-[#0a0a0a]">M. D., Bureau d&apos;études</p>
              <p className="text-sm text-[#171717]">Paris</p>
            </div>
          </div>
        </div>
      </section>

      {/* GUIDES PRATIQUES */}
      <section className="px-6 md:px-8 py-16 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0a0a0a] mb-2 text-center">Guides décennale et dommage ouvrage</h2>
          <p className="text-[#171717] text-center mb-8 max-w-xl mx-auto">
            Obligation, résiliation, sinistre, auto-construction, clos et couvert.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/guides/obligation-decennale" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">L&apos;obligation décennale</p>
              <p className="text-sm text-[#171717] mt-1">Loi Spinetta, sanctions, qui doit souscrire</p>
            </Link>
            <Link href="/guides/resiliation-decennale" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">Résilier sa décennale</p>
              <p className="text-sm text-[#171717] mt-1">Délais, lettre recommandée, changement d&apos;assureur</p>
            </Link>
            <Link href="/guides/declaration-sinistre" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">Déclarer un sinistre</p>
              <p className="text-sm text-[#171717] mt-1">Procédure, délais, documents à fournir</p>
            </Link>
            <Link href="/guides/obligation-dommage-ouvrage" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">Obligation dommage ouvrage</p>
              <p className="text-sm text-[#171717] mt-1">Maîtres d&apos;ouvrage, constructeurs, promoteurs</p>
            </Link>
            <Link href="/guides/dommage-ouvrage-auto-construction" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">DO auto-construction</p>
              <p className="text-sm text-[#171717] mt-1">Particulier qui fait construire sa maison</p>
            </Link>
            <Link href="/guides/garantie-clos-couvert" className="p-5 bg-[var(--background)] rounded-xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <p className="font-semibold text-[#0a0a0a] group-hover:text-[#C65D3B]">Garantie clos et couvert</p>
              <p className="text-sm text-[#171717] mt-1">Définition, lots couverts, avantages</p>
            </Link>
          </div>
          <p className="text-center mt-6">
            <Link href="/guides" className="text-[#C65D3B] font-semibold hover:underline">Voir tous les guides →</Link>
          </p>
        </div>
      </section>

      {/* PARTENAIRES TECHNIQUES */}
      <section className="px-6 md:px-8 py-16 bg-[var(--background)] border-y border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Partenaires de confiance</h2>
          <p className="text-[#171717] text-sm mb-8">Paiement sécurisé et signature électronique certifiée</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            <div className="px-6 py-3 bg-white rounded-xl border border-[#e5e5e5] font-semibold text-[#0a0a0a]">Mollie</div>
            <div className="px-6 py-3 bg-white rounded-xl border border-[#e5e5e5] font-semibold text-[#0a0a0a]">Yousign</div>
          </div>
        </div>
      </section>

      {/* PARTENARIATS */}
      <section className="px-6 md:px-8 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#0a0a0a] mb-4">Partenariats professionnels</h2>
          <p className="text-[#171717] mb-8 leading-relaxed">
            Optimum Assurance travaille avec les syndicats, fédérations du BTP et plateformes de mise en relation pour offrir des tarifs préférentiels à leurs adhérents.
          </p>
          <p className="text-sm text-[#171717]">
            Vous représentez une organisation ? <Link href="/devis" className="text-[#C65D3B] font-semibold hover:underline">Contactez-nous</Link> pour discuter d&apos;un partenariat.
          </p>
        </div>
      </section>

      {/* CONTACT — Comment pouvons-nous vous aider ? */}
      <section className="px-6 md:px-8 py-20 bg-white border-y border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-2 text-center">
            Comment pouvons-nous vous aider ?
          </h2>
          <p className="text-[#171717] text-center mb-12">
            Notre équipe vous accompagne à chaque étape. Un sinistre ? Pas de panique.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <OpenChatbotButton />
            <Link href="/contact" className="flex flex-col items-center p-6 bg-[var(--background)] rounded-2xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <span className="text-3xl mb-3">✉️</span>
              <p className="font-semibold text-[#0a0a0a]">Formulaire</p>
              <p className="text-sm text-[#171717] mt-1">Réponse sous 24h</p>
              <p className="text-xs text-[#C65D3B] mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Nous contacter</p>
            </Link>
            <Link href="/faq#sinistre" className="flex flex-col items-center p-6 bg-[var(--background)] rounded-2xl border border-[#e5e5e5] hover:border-[#C65D3B]/40 hover:bg-[#FEF3F0] transition-all group">
              <span className="text-3xl mb-3">⚠️</span>
              <p className="font-semibold text-[#0a0a0a]">Sinistre</p>
              <p className="text-sm text-[#171717] mt-1">Déclaration rapide</p>
              <p className="text-xs text-[#C65D3B] mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Comment déclarer</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-8 py-20 bg-[var(--background)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] mb-8">
            Conformité légale et meilleur prix — protégez votre activité dès aujourd&apos;hui
          </h2>
          <Link
            href="/devis"
            className="inline-block bg-[#C65D3B] text-white px-10 py-4 rounded-2xl hover:bg-[#B04F2F] transition-all font-semibold shadow-lg shadow-[#C65D3B]/25 hover:-translate-y-0.5"
          >
            Mon devis en 3 minutes
          </Link>
        </div>
      </section>
    </main>
  )
}
