import Link from "next/link"

const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export function Footer() {
  return (
    <footer className="px-4 sm:px-6 md:px-8 py-10 sm:py-12 border-t border-[#e5e5e5] bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <p className="font-bold text-[#0a0a0a] text-lg">Optimum Assurance</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href={`mailto:${contactEmail}`} className="text-[#171717] hover:text-[#B04F2F] transition-colors">
              {contactEmail}
            </a>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/contact" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Contact
            </Link>
            <Link href="/avis" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Avis clients
            </Link>
            <Link href="/guides" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Guides
            </Link>
            <Link href="/faq" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              FAQ
            </Link>
            <Link href="/cgv" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              CGV
            </Link>
            <Link href="/mentions-legales" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Confidentialité
            </Link>
            <Link href="/droits-personnes" className="text-[#171717] hover:text-[#B04F2F] transition-colors py-2 min-h-[44px] flex items-center">
              Droits RGPD
            </Link>
          </nav>
          <p className="text-sm text-[#171717]">© 2026 — Paiement sécurisé Mollie</p>
        </div>
      </div>
    </footer>
  )
}
