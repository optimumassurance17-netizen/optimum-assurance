import Link from "next/link"
import { Header } from "@/components/Header"
import { JsonLd } from "@/components/JsonLd"
import { COMPANY_BRAND, INSURER_NAME, ORIAS_NUMBER } from "@/lib/legal-branding"
import { SITE_URL } from "@/lib/site-url"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = SITE_URL

export const metadata = {
  title: "À propos d'Optimum Assurance | Courtier assurance construction",
  description:
    "Optimum Assurance accompagne les professionnels du BTP et maîtres d'ouvrage : décennale, dommage ouvrage, RC fabricant, signature électronique et espace client.",
  alternates: { canonical: `${baseUrl}/a-propos` },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    url: `${baseUrl}/a-propos`,
    title: "À propos d'Optimum Assurance",
    description:
      "Courtier spécialisé assurance construction : décennale BTP, dommage ouvrage, RC fabricant et parcours digital.",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

const jsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "À propos", path: "/a-propos" },
  ]),
  seoWebPageNode({
    path: "/a-propos",
    name: "À propos d'Optimum Assurance",
    description:
      "Présentation du courtier, de son expertise assurance construction et de son parcours digital.",
  }),
])

export default function AProposPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-a-propos" data={jsonLd} />
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-14">
        <nav aria-label="Fil d'Ariane" className="mb-8 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            Accueil
          </Link>
          <span className="mx-2 text-[#333333]">/</span>
          <span className="font-medium text-[#0a0a0a]">À propos</span>
        </nav>

        <h1 className="mb-4 text-3xl font-bold text-[#0a0a0a] md:text-4xl">
          À propos d'Optimum Assurance
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-[#171717]">
          Optimum Assurance est une plateforme de courtage spécialisée dans l'assurance construction :
          décennale BTP, dommage ouvrage et RC fabricant. Notre objectif est de rendre les parcours plus
          lisibles, plus rapides et mieux documentés, tout en conservant les étapes de validation nécessaires.
        </p>

        <section className="mb-10 rounded-2xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="mb-3 text-xl font-bold text-[#0a0a0a]">Identité et cadre d'intervention</h2>
          <ul className="space-y-2 text-[#171717]">
            <li>
              Marque commerciale : <strong>Optimum Assurance</strong>
            </li>
            <li>
              Courtier : <strong>{COMPANY_BRAND}</strong>
            </li>
            <li>
              Intermédiaire ORIAS : <strong>{ORIAS_NUMBER}</strong>
            </li>
            <li>
              Porteur / délégation : <strong>{INSURER_NAME}</strong>
            </li>
          </ul>
          <p className="mt-4 text-sm text-[#171717]">
            Les mentions complètes sont disponibles sur la page{" "}
            <Link href="/mentions-legales" className="font-medium text-blue-600 hover:underline">
              mentions légales
            </Link>
            .
          </p>
        </section>

        <section className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
            <h2 className="mb-2 text-lg font-bold text-[#0a0a0a]">Décennale BTP</h2>
            <p className="text-sm leading-relaxed text-[#171717]">
              Devis en ligne, activités BTP, devoir de conseil, signature électronique, mandat SEPA et attestation
              après paiement, contrôle du dossier et acceptation du risque.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
            <h2 className="mb-2 text-lg font-bold text-[#0a0a0a]">Dommage ouvrage</h2>
            <p className="text-sm leading-relaxed text-[#171717]">
              Demande DO, étude du dossier, devis et conditions, paiement par virement Mollie, puis attestation et
              facture après activation du contrat.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
            <h2 className="mb-2 text-lg font-bold text-[#0a0a0a]">RC fabricant</h2>
            <p className="text-sm leading-relaxed text-[#171717]">
              Dossiers étudiés par l'équipe de gestion : qualification du risque, proposition, signature PDF
              personnalisée et échéances pilotées depuis l'espace client.
            </p>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="mb-3 text-xl font-bold text-[#0a0a0a]">Sources utiles pour comprendre nos garanties</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/guides/obligation-decennale" className="font-medium text-blue-700 hover:underline">
              Guide obligation décennale
            </Link>
            <Link href="/guides/obligation-dommage-ouvrage" className="font-medium text-blue-700 hover:underline">
              Guide obligation dommage ouvrage
            </Link>
            <Link href="/conditions-attestations" className="font-medium text-blue-700 hover:underline">
              Conditions d'émission des attestations
            </Link>
            <Link href="/cgv" className="font-medium text-blue-700 hover:underline">
              Conditions générales de vente
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/devis"
            className="rounded-2xl bg-[#2563eb] px-6 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Obtenir un devis décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="rounded-2xl border-2 border-[#2563eb] px-6 py-3 text-center font-semibold text-[#2563eb] hover:bg-[#eff6ff]"
          >
            Demander un devis DO
          </Link>
        </div>
      </article>
    </main>
  )
}
