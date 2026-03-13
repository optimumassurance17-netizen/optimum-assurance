import Link from "next/link"
import { Header } from "@/components/Header"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FDF8F3] flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-8xl font-bold text-[#C65D3B]/20 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-black mb-2">Page introuvable</h1>
        <p className="text-[#171717] mb-10 text-center max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/"
            className="bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium text-center"
          >
            Accueil
          </Link>
          <Link
            href="/devis"
            className="bg-white border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-3 rounded-xl hover:bg-[#FEF3F0] transition font-medium text-center"
          >
            Devis décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="bg-white border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-3 rounded-xl hover:bg-[#FEF3F0] transition font-medium text-center"
          >
            Devis dommage ouvrage
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/espace-client" className="text-[#C65D3B] hover:underline font-medium">Espace client</Link>
          <Link href="/contact" className="text-[#C65D3B] hover:underline font-medium">Contact</Link>
          <Link href="/faq" className="text-[#C65D3B] hover:underline font-medium">FAQ</Link>
          <Link href="/guides" className="text-[#C65D3B] hover:underline font-medium">Guides</Link>
          <Link href="/mentions-legales" className="text-[#C65D3B] hover:underline font-medium">Mentions légales</Link>
          <Link href="/confidentialite" className="text-[#C65D3B] hover:underline font-medium">Confidentialité</Link>
        </div>
      </div>
    </main>
  )
}
