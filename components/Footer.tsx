import Link from "next/link"
import { DelegationLegalLine } from "@/components/premium/DelegationLegalLine"
import { buildWhatsAppRedirectPath } from "@/lib/whatsapp"

const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"
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
              WhatsApp : +33 7 81 59 67 07
            </a>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/devis" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Devis décennale
            </Link>
            <Link href="/devis-dommage-ouvrage" className="flex min-h-[44px] items-center py-2 text-slate-700 transition-colors hover:text-blue-600">
              Dommage ouvrage
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
