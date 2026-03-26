"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"

export function HeaderClient() {
  const { data: session, status } = useSession()
  const [devisOpen, setDevisOpen] = useState(false)
  const devisRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (devisRef.current && !devisRef.current.contains(e.target as Node)) {
        setDevisOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  return (
    <header className="relative z-50 overflow-visible px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-[#e5e5e5] bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#C65D3B] rounded-xl flex items-center justify-center shadow-md shadow-[#C65D3B]/20 shrink-0">
            <span className="text-white font-bold">O</span>
          </div>
          <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#0a0a0a] truncate">
            Optimum
          </span>
        </Link>

        {/* Desktop nav — uniquement sur grands écrans (lg+) pour éviter le dropdown buggé sur mobile/tablette */}
        <nav className="hidden lg:flex items-center gap-2 sm:gap-4 shrink-0" aria-label="Navigation principale">
          <Link href="/devis-dommage-ouvrage" className="text-[#171717] hover:text-[#0a0a0a] font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center justify-center transition-colors">
            Dommage ouvrage
          </Link>
          <Link href="/faq" className="text-[#171717] hover:text-[#0a0a0a] font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 flex items-center justify-center transition-colors">
            FAQ
          </Link>
          <Link href="/guides" className="text-[#171717] hover:text-[#0a0a0a] font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 items-center justify-center transition-colors">
            Guides
          </Link>
          <Link
            href="/espace-client"
            className="border-2 border-[#C65D3B] text-[#C65D3B] px-3 sm:px-4 py-2 rounded-xl hover:bg-[#C65D3B] hover:text-white font-semibold text-sm sm:text-base transition-all min-h-[44px] flex items-center"
          >
            Espace client
          </Link>
          {status === "authenticated" && session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[#333333] hover:text-[#C65D3B] font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center transition-colors"
            >
              Déconnexion
            </button>
          )}
          <div className="relative" ref={devisRef} role="group" aria-label="Obtenir un devis">
            <button
              type="button"
              onClick={() => setDevisOpen((o) => !o)}
              className="bg-[#C65D3B] text-white px-4 sm:px-6 py-2.5 rounded-xl hover:bg-[#B04F2F] transition-all shadow-md shadow-[#C65D3B]/20 font-semibold flex items-center gap-1.5 min-h-[44px] text-sm sm:text-base"
              aria-haspopup="true"
              aria-expanded={devisOpen}
              aria-controls="devis-menu"
              id="devis-trigger"
            >
              Obtenir un devis <span className="text-sm" aria-hidden="true">▾</span>
            </button>
            <div
              id="devis-menu"
              role="menu"
              aria-labelledby="devis-trigger"
              className={`absolute right-0 top-full mt-1 py-2 min-w-[260px] w-72 bg-white rounded-xl border border-[#e5e5e5] shadow-xl transition-all z-[60] ${
                devisOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
              }`}
            >
              <div className="px-4 py-2 border-b border-[#e5e5e5]">
                <p className="text-xs font-semibold text-[#333333] uppercase tracking-wide">Décennale BTP</p>
              </div>
              <Link
                href="/devis"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="block px-4 py-3.5 text-[#0a0a0a] hover:bg-[#FEF3F0] font-medium active:bg-[#FEF3F0] min-h-[44px] flex items-center whitespace-nowrap"
              >
                Devis décennale — 3 min
              </Link>
              <div className="px-4 py-2 border-b border-[#e5e5e5]">
                <p className="text-xs font-semibold text-[#333333] uppercase tracking-wide">Dommage ouvrage</p>
              </div>
              <Link
                href="/devis-dommage-ouvrage"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="block px-4 py-3.5 text-[#0a0a0a] hover:bg-[#FEF3F0] font-medium active:bg-[#FEF3F0] min-h-[44px] flex items-center whitespace-nowrap"
              >
                Devis dommage ouvrage — 24h
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile/Tablette: Décennale, DO, Espace client — scroll horizontal si débordement */}
        <nav className="flex lg:hidden items-center gap-2 min-w-0 flex-1 justify-start overflow-x-auto scrollbar-hide py-1 -mx-1 flex-nowrap" aria-label="Navigation mobile">
          <Link
            href="/devis"
            className="bg-[#B04F2F] text-white px-2.5 py-2 rounded-lg font-semibold text-xs min-h-[44px] flex items-center shrink-0 whitespace-nowrap"
          >
            Décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="bg-[#B04F2F] text-white px-2.5 py-2 rounded-lg font-semibold text-xs min-h-[44px] flex items-center shrink-0 whitespace-nowrap"
          >
            DO
          </Link>
          <Link
            href="/faq"
            className="text-[#171717] font-medium text-xs px-2 py-2 rounded-lg min-h-[44px] flex items-center shrink-0 whitespace-nowrap"
          >
            FAQ
          </Link>
          <Link
            href="/guides"
            className="text-[#171717] font-medium text-xs px-2 py-2 rounded-lg min-h-[44px] flex items-center shrink-0 whitespace-nowrap"
          >
            Guides
          </Link>
          <Link
            href="/espace-client"
            className="border-2 border-[#B04F2F] text-[#B04F2F] px-2.5 py-2 rounded-lg font-semibold text-xs min-h-[44px] flex items-center shrink-0 whitespace-nowrap"
          >
            Espace client
          </Link>
          {status === "authenticated" && session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[#333333] hover:text-[#B04F2F] font-medium text-xs py-2 px-2 rounded-lg min-h-[44px] shrink-0"
            >
              Déconnexion
            </button>
          )}
        </nav>
      </div>

    </header>
  )
}
