import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { FormulaireRcFabriquant } from "@/components/FormulaireRcFabriquant"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const canonical = `${SITE_URL}/devis-rc-fabriquant`

export const metadata: Metadata = {
  title: "Devis RC Fabriquant | Responsabilité civile fabricant | Optimum Assurance",
  description: truncateForDescription(
    "Demande de devis assurance Responsabilité Civile Fabriquant (RC Fabriquant) pour industriels et fabricants. Étude personnalisée sous 24 à 48 h.",
    158
  ),
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Devis RC Fabriquant | Optimum Assurance",
    description:
      "Assurance responsabilité civile du fabricant : décrivez votre activité, un conseiller vous répond sous 24 à 48 h.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
  },
}

export default function DevisRcFabriquantPage() {
  return (
    <main className="min-h-screen bg-slate-50/80">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "RC Fabriquant", href: "/devis-rc-fabriquant" },
          ]}
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-4 mb-3">
          Assurance RC Fabriquant
        </h1>
        <p className="text-slate-600 mb-2 leading-relaxed">
          La <strong>responsabilité civile fabricant</strong> couvre les dommages causés aux tiers par vos produits
          après leur mise sur le marché (défaut de conception, fabrication, absence ou insuffisance de consignes,
          etc.), selon les garanties et exclusions du contrat proposé par l’assureur.
        </p>
        <p className="text-slate-600 mb-8 leading-relaxed text-sm">
          Il n’y a pas de tarificateur en ligne pour ce risque : chaque dossier (nature des produits, zone de
          distribution, chiffre d’affaires, sinistralité) fait l’objet d’une <strong>étude</strong>. Le formulaire compte{" "}
          <strong>quatre étapes</strong> (entreprise, activité fabricant, chiffre d’affaires, sinistralité). Un conseiller
          Optimum vous recontacte en général sous <strong>24 à 48 h ouvrées</strong>.
        </p>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-10">
          <FormulaireRcFabriquant />
        </div>
        <p className="text-sm text-slate-500">
          Décennale BTP ou dommage ouvrage ?{" "}
          <Link href="/devis" className="text-blue-600 font-medium hover:underline">
            Devis décennale
          </Link>
          {" · "}
          <Link href="/devis-dommage-ouvrage" className="text-blue-600 font-medium hover:underline">
            Devis dommage ouvrage
          </Link>
        </p>
      </div>
    </main>
  )
}
