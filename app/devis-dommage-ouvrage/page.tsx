import Link from "next/link"
import { JsonLd } from "@/components/JsonLd"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DevisDommageOuvrageClientGate } from "@/components/DevisDommageOuvrageClientGate"
import { FormulaireDevisDommageOuvrage } from "@/components/FormulaireDevisDommageOuvrage"
import { seoBreadcrumbListNode, seoJsonLdGraph, seoWebPageNode } from "@/lib/seo-jsonld-helpers"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata = {
  title: "Devis Dommage Ouvrage en Ligne — Auto-construction | Optimum",
  description:
    "Devis assurance dommage ouvrage : obligatoire pour constructeurs et promoteurs. Auto-construction acceptée. Garantie clos et couvert. Devis sous 24h.",
  keywords: ["devis dommage ouvrage", "assurance dommage ouvrage", "dommage ouvrage auto-construction", "garantie clos et couvert"],
  alternates: { canonical: `${baseUrl}/devis-dommage-ouvrage` },
  openGraph: {
    url: `${baseUrl}/devis-dommage-ouvrage`,
    title: "Devis Dommage Ouvrage | Optimum Assurance",
    description: "Assurance obligatoire maîtres d'ouvrage. Auto-construction, clos et couvert. Devis sous 24h.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devis Dommage Ouvrage | Optimum Assurance",
    images: [`${baseUrl}/opengraph-image`],
  },
}

const doDevisJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Devis dommage ouvrage", path: "/devis-dommage-ouvrage" },
  ]),
  seoWebPageNode({
    path: "/devis-dommage-ouvrage",
    name: "Devis assurance dommage ouvrage en ligne",
    description:
      "Formulaire dommage ouvrage pour maîtres d'ouvrage : auto-construction, clos et couvert, devis sous 24h après étude.",
  }),
])

export default function DevisDommageOuvragePage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <JsonLd id="jsonld-devis-do" data={doDevisJsonLd} />
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-black">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis dommage ouvrage" }]} />

        <div className="mb-8">
          <span className="inline-block bg-[#eff6ff] text-[#2563eb] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            Dommage ouvrage — Devis en ligne
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3">
            Assurance dommage ouvrage pour maîtres d&apos;ouvrage
          </h1>
          <p className="text-black leading-relaxed mb-4">
            L&apos;assurance dommage ouvrage est obligatoire pour les maîtres d&apos;ouvrage (constructeurs, promoteurs). Elle couvre les dommages matériels affectant la solidité du bâtiment pendant la construction et jusqu&apos;à 10 ans après réception.
          </p>
          <div className="bg-[#eff6ff] border border-[#2563eb]/20 rounded-xl p-5">
            <p className="font-semibold text-black mb-2">✓ Ce que nous acceptons :</p>
            <ul className="text-black space-y-1 text-sm">
              <li>• <strong>Auto-construction</strong> — Particuliers faisant construire pour leur compte (habitation, locatif, revente)</li>
              <li>• <strong>Clos et couvert uniquement</strong> — Garantie limitée aux lots terrassement, VRD, gros œuvre, charpente, couverture, menuiserie extérieure</li>
              <li>• <strong>Reprise du passé</strong> — Jusqu&apos;à 2 ans en arrière (sous réserve de non sinistralité) — soumis à étude</li>
            </ul>
          <p className="text-sm text-black mt-3">
            Prix indicatifs selon le coût de construction. Prix définitif à la fin de l&apos;étude sous 24h.
          </p>
          <p className="text-sm text-black mt-2">
            Après création de compte, vous pourrez déposer vos documents (permis, DOC, plans, conventions, étude de sol) dans votre espace client GED.
          </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/dommage-ouvrage/auto-construction" className="text-sm text-[#2563eb] font-medium hover:underline">Auto-construction</Link>
            <span className="text-[#333333]">•</span>
            <Link href="/dommage-ouvrage/particulier" className="text-sm text-[#2563eb] font-medium hover:underline">Particulier</Link>
            <span className="text-[#333333]">•</span>
            <Link href="/dommage-ouvrage/constructeur-promoteur" className="text-sm text-[#2563eb] font-medium hover:underline">Constructeur</Link>
            <span className="text-[#333333]">•</span>
            <Link href="/dommage-ouvrage/clos-et-couvert" className="text-sm text-[#2563eb] font-medium hover:underline">Clos et couvert</Link>
          </div>
        </div>

        <DevisDommageOuvrageClientGate>
          <FormulaireDevisDommageOuvrage />
        </DevisDommageOuvrageClientGate>
      </div>
    </main>
  )
}
