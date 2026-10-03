import Link from "next/link"
import { DelegationLegalLine } from "@/components/premium/DelegationLegalLine"
import { getPublicContactEmail } from "@/lib/public-contact-email"
import { buildWhatsAppRedirectPath } from "@/lib/whatsapp"

const contactEmail = getPublicContactEmail()
const whatsappUrl = buildWhatsAppRedirectPath({
  source: "footer",
  context: "navigation-footer",
})

export function Footer() {
  return (
    <footer className="border-t border-slate-200/90 bg-white px-4 py-10 sm:px-6 md:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-center md:text-left">
          <DelegationLegalLine size="xs" className="md:text-center" />
        </div>
        <div className="mb-8 flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-lg font-bold text-slate-900">Optimum Assurance</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href={`mailto:${contactEmail}`} className="text-slate-700 transition-colors hover:text-blue-600">
              {contactEmail}
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 transition-colors hover:text-[#25D366]"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="mb-8 border-b border-slate-200/80 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Métiers décennale les plus demandés
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/assurance-decennale/plombier" className="text-slate-700 hover:text-blue-600 transition-colors">
              Plombier
            </Link>
            <Link href="/assurance-decennale/electricien" className="text-slate-700 hover:text-blue-600 transition-colors">
              Électricien
            </Link>
            <Link href="/assurance-decennale/macon" className="text-slate-700 hover:text-blue-600 transition-colors">
              Maçon
            </Link>
            <Link href="/assurance-decennale/peintre" className="text-slate-700 hover:text-blue-600 transition-colors">
              Peintre
            </Link>
            <Link href="/assurance-decennale/couvreur" className="text-slate-700 hover:text-blue-600 transition-colors">
              Couvreur
            </Link>
            <Link href="/assurance-decennale/menuisier" className="text-slate-700 hover:text-blue-600 transition-colors">
              Menuisier
            </Link>
            <Link href="/assurance-decennale/charpentier" className="text-slate-700 hover:text-blue-600 transition-colors">
              Charpentier
            </Link>
            <Link href="/assurance-decennale/carreleur" className="text-slate-700 hover:text-blue-600 transition-colors">
              Carreleur
            </Link>
            <Link href="/assurance-decennale/etancheite" className="text-slate-700 hover:text-blue-600 transition-colors">
              Étanchéité
            </Link>
            <Link href="/assurance-decennale/terrassement" className="text-slate-700 hover:text-blue-600 transition-colors">
              Terrassement
            </Link>
            <Link href="/assurance-decennale/maitre-d-oeuvre" className="text-slate-700 hover:text-blue-600 transition-colors">
              Maître d&apos;œuvre
            </Link>
            <Link href="/assurance-decennale/architecte" className="text-slate-700 hover:text-blue-600 transition-colors">
              Architecte
            </Link>
            <Link href="/assurance-decennale" className="text-blue-600 font-medium hover:underline">
              Tous les métiers →
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/devis" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Devis décennale
            </Link>
            <Link href="/assurance-decennale" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Activités décennale
            </Link>
            <Link href="/devis-dommage-ouvrage" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Dommage ouvrage
            </Link>
            <Link href="/dommage-ouvrage" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Profils DO
            </Link>
            <Link href="/assurance-titre" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Assurance titre
            </Link>
            <Link href="/contact" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Contact
            </Link>
            <Link href="/avis" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Avis clients
            </Link>
            <Link href="/guides" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Guides
            </Link>
            <Link href="/a-propos" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              À propos
            </Link>
            <Link href="/comparatifs/decennale-vs-rc-pro" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Comparatifs
            </Link>
            <Link href="/prix-assurance-decennale" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Prix décennale
            </Link>
            <Link href="/documents-assurance-decennale" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Documents décennale
            </Link>
            <Link href="/faq" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              FAQ
            </Link>
            <Link href="/cgv" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              CGV
            </Link>
            <Link href="/conditions-attestations" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Attestations
            </Link>
            <Link href="/mentions-legales" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Confidentialité
            </Link>
            <Link href="/droits-personnes" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Droits RGPD
            </Link>
          </nav>
          <p className="text-sm text-slate-600">© 2026 — Paiement sécurisé Mollie</p>
        </div>
      </div>
    </footer>
  )
}
