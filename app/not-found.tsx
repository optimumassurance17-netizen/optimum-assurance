import Link from "next/link"
import { Header } from "@/components/Header"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-8xl font-bold text-[#2563eb]/20 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-black mb-2">Page introuvable</h1>
        <p className="text-[#171717] mb-10 text-center max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/"
            className="bg-[#2563eb] text-white px-8 py-3 rounded-xl hover:bg-[#1d4ed8] transition font-medium text-center"
          >
            Accueil
          </Link>
          <Link
            href="/devis"
            className="bg-white border-2 border-[#2563eb] text-[#2563eb] px-8 py-3 rounded-xl hover:bg-[#eff6ff] transition font-medium text-center"
          >
            Devis décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="bg-white border-2 border-[#2563eb] text-[#2563eb] px-8 py-3 rounded-xl hover:bg-[#eff6ff] transition font-medium text-center"
          >
            Devis dommage ouvrage
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/espace-client" className="text-[#2563eb] hover:underline font-medium">Espace client</Link>
          <Link href="/contact" className="text-[#2563eb] hover:underline font-medium">Contact</Link>
          <Link href="/faq" className="text-[#2563eb] hover:underline font-medium">FAQ</Link>
          <Link href="/guides" className="text-[#2563eb] hover:underline font-medium">Guides</Link>
          <Link href="/mentions-legales" className="text-[#2563eb] hover:underline font-medium">Mentions légales</Link>
          <Link href="/confidentialite" className="text-[#2563eb] hover:underline font-medium">Confidentialité</Link>
        </div>
      </div>
    </main>
  )
}
