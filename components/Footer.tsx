import Link from "next/link"

const contactEmail = process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"

export function Footer() {
  return (
    <footer className="px-6 md:px-8 py-12 border-t border-[#e5e5e5] bg-white dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <p className="font-bold text-[#0a0a0a] dark:text-white text-lg">Optimum Assurance</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href={`mailto:${contactEmail}`} className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              {contactEmail}
            </a>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/contact" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Contact
            </Link>
            <Link href="/avis" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Avis clients
            </Link>
            <Link href="/guides" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Guides
            </Link>
            <Link href="/faq" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              FAQ
            </Link>
            <Link href="/cgv" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              CGV
            </Link>
            <Link href="/mentions-legales" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Confidentialité
            </Link>
            <Link href="/droits-personnes" className="text-[#171717] dark:text-gray-300 hover:text-[#C65D3B] transition-colors">
              Droits RGPD
            </Link>
          </nav>
          <p className="text-sm text-[#171717] dark:text-gray-400">© 2026 — Paiement sécurisé Mollie</p>
        </div>
      </div>
    </footer>
  )
}
