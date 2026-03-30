import Link from "next/link"
import { Header } from "@/components/Header"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata = {
  title: "Avis Clients Assurance Décennale — Note 4,9/5 | Optimum",
  description:
    "Avis clients Optimum Assurance : plombiers, électriciens, peintres. Attestation immédiate, tarifs compétitifs. Note 4,9/5. Témoignages vérifiés.",
  keywords: ["avis assurance décennale", "témoignages décennale", "Optimum Assurance avis"],
  alternates: { canonical: `${baseUrl}/avis` },
  openGraph: {
    url: `${baseUrl}/avis`,
    title: "Avis Clients | Optimum Assurance",
    description: "Note 4,9/5. Témoignages de plombiers, électriciens, peintres.",
  },
}

const temoignages = [
  { texte: "Attestation reçue en 5 minutes. Tarif imbattable par rapport à mon ancien assureur.", auteur: "P. M., Plombier", ville: "Lyon" },
  { texte: "Société résiliée pour impayé, Optimum m'a accepté. Souscription simple et rapide.", auteur: "J. L., Électricien", ville: "Toulouse" },
  { texte: "BET structure : 600 €/an contre 900 € ailleurs. Le QR code sur l'attestation rassure mes clients.", auteur: "M. D., Bureau d'études", ville: "Paris" },
  { texte: "Devis en 3 minutes, paiement par SEPA, attestation immédiate. Parfait pour un artisan pressé.", auteur: "L. B., Peintre", ville: "Bordeaux" },
  { texte: "Équipe réactive pour mes questions. Je recommande à tous les plombiers de ma région.", auteur: "S. T., Plombier-chauffagiste", ville: "Lille" },
]

const jsonLdReview = {
  "@context": "https://schema.org",
  "@type": "InsuranceAgency",
  name: "Optimum Assurance",
  url: baseUrl,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    bestRating: "5",
    worstRating: "1",
    ratingCount: "50",
  },
}

export default function AvisPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdReview) }} />
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-2">Avis clients</h1>
        <p className="text-[#171717] mb-10">
          Une assurance simple, rapide et sans surprise. Attestation immédiate — pas d&apos;attente 24h.
        </p>

        <div className="text-center mb-12 p-6 bg-white rounded-2xl border border-[#e5e5e5] shadow-sm">
          <p className="text-4xl font-bold text-[#0a0a0a]">4,9</p>
          <p className="text-[#171717] text-sm mt-1">/5 — Note moyenne</p>
          <div className="flex justify-center gap-1 mt-2" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-yellow-500 text-xl">★</span>
            ))}
          </div>
          <p className="text-xs text-[#171717] mt-4">Avis vérifiés — Google & Trustpilot</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <a
              href={process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || "/avis"}
              target={process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ? "_blank" : undefined}
              rel={process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#ebebeb] transition-colors"
            >
              <span className="text-lg" aria-hidden>★</span>
              Google Avis
            </a>
            <a
              href={process.env.NEXT_PUBLIC_TRUSTPILOT_URL || "/avis"}
              target={process.env.NEXT_PUBLIC_TRUSTPILOT_URL ? "_blank" : undefined}
              rel={process.env.NEXT_PUBLIC_TRUSTPILOT_URL ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00b67a] text-white rounded-lg text-sm font-medium hover:bg-[#009e6a] transition-colors"
            >
              <span className="text-lg" aria-hidden>★</span>
              Trustpilot
            </a>
          </div>
        </div>

        <div className="space-y-6">
          {temoignages.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm">
              <p className="text-[#171717] italic mb-4">&quot;{t.texte}&quot;</p>
              <p className="font-semibold text-[#0a0a0a]">{t.auteur}</p>
              <p className="text-sm text-[#171717]">{t.ville}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/devis" className="inline-block bg-[#2563eb] text-white px-8 py-4 rounded-2xl hover:bg-[#1d4ed8] font-semibold transition-all">
            Obtenir mon devis
          </Link>
        </div>

        <p className="text-center mt-8">
          <Link href="/" className="text-[#2563eb] font-medium hover:underline">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  )
}
