"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { ThemeToggle } from "@/components/ThemeToggle"

export function HeaderClient() {
  const { data: session, status } = useSession()
  const [devisOpen, setDevisOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  const closeMobile = () => setMobileMenuOpen(false)

  const navLinks = (
    <>
      {/* Obtenir un devis — en premier, bien visible, ne pas compresser */}
      <div className="pb-4 mb-4 border-b border-[#e5e5e5] dark:border-gray-700 flex-shrink-0">
        <p className="text-xs font-semibold text-[#737373] dark:text-gray-400 uppercase tracking-wide px-1 mb-3">Obtenir un devis</p>
        <Link
          href="/devis"
          onClick={closeMobile}
          className="flex items-center justify-between w-full bg-[#C65D3B] text-white px-4 py-3.5 rounded-xl font-semibold mb-3 hover:bg-[#B04F2F] transition-colors min-h-[48px]"
        >
          Devis décennale — 3 min
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/devis-dommage-ouvrage"
          onClick={closeMobile}
          className="flex items-center justify-between w-full bg-[#C65D3B] text-white px-4 py-3.5 rounded-xl font-semibold hover:bg-[#B04F2F] transition-colors min-h-[48px]"
        >
          Devis dommage ouvrage — 24h
          <span aria-hidden>→</span>
        </Link>
      </div>
      <Link href="/devis-dommage-ouvrage" onClick={closeMobile} className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-base py-3 min-h-[44px] flex items-center transition-colors">
        Dommage ouvrage
      </Link>
      <Link href="/faq" onClick={closeMobile} className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-base py-3 min-h-[44px] flex items-center transition-colors">
        FAQ
      </Link>
      <Link href="/guides" onClick={closeMobile} className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-base py-3 min-h-[44px] flex items-center transition-colors">
        Guides
      </Link>
      <Link href="/espace-client" onClick={closeMobile} className="border-2 border-[#C65D3B] text-[#C65D3B] px-4 py-3 rounded-xl hover:bg-[#C65D3B] hover:text-white font-semibold text-base transition-all dark:border-[#C65D3B] dark:text-[#C65D3B] dark:hover:bg-[#C65D3B] dark:hover:text-white min-h-[44px] flex items-center">
        Espace client
      </Link>
      {status === "authenticated" && session && (
        <button type="button" onClick={() => { closeMobile(); signOut({ callbackUrl: "/" }) }} className="text-[#737373] hover:text-[#C65D3B] dark:text-gray-400 dark:hover:text-[#C65D3B] font-medium text-base py-3 min-h-[44px] flex items-center transition-colors text-left w-full">
          Déconnexion
        </button>
      )}
    </>
  )

  return (
    <header className="relative z-50 overflow-visible px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-[#e5e5e5] bg-white/95 backdrop-blur-sm dark:bg-gray-900/95 dark:border-gray-700">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#C65D3B] rounded-xl flex items-center justify-center shadow-md shadow-[#C65D3B]/20 shrink-0">
            <span className="text-white font-bold">O</span>
          </div>
          <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#0a0a0a] dark:text-white truncate">
            Optimum
          </span>
        </Link>

        {/* Desktop nav — uniquement sur grands écrans (lg+) pour éviter le dropdown buggé sur mobile/tablette */}
        <nav className="hidden lg:flex items-center gap-2 sm:gap-4 shrink-0" aria-label="Navigation principale">
          <ThemeToggle />
          <Link href="/devis-dommage-ouvrage" className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center justify-center transition-colors">
            Dommage ouvrage
          </Link>
          <Link href="/faq" className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 flex items-center justify-center transition-colors">
            FAQ
          </Link>
          <Link href="/guides" className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 items-center justify-center transition-colors">
            Guides
          </Link>
          <Link
            href="/espace-client"
            className="border-2 border-[#C65D3B] text-[#C65D3B] px-3 sm:px-4 py-2 rounded-xl hover:bg-[#C65D3B] hover:text-white font-semibold text-sm sm:text-base transition-all dark:border-[#C65D3B] dark:text-[#C65D3B] dark:hover:bg-[#C65D3B] dark:hover:text-white min-h-[44px] flex items-center"
          >
            Espace client
          </Link>
          {status === "authenticated" && session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[#737373] hover:text-[#C65D3B] dark:text-gray-400 dark:hover:text-[#C65D3B] font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center transition-colors"
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
              className={`absolute right-0 top-full mt-1 py-2 min-w-[260px] w-72 bg-white rounded-xl border border-[#e5e5e5] shadow-xl transition-all z-[60] dark:bg-gray-800 dark:border-gray-700 ${
                devisOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
              }`}
            >
              <div className="px-4 py-2 border-b border-[#e5e5e5] dark:border-gray-700">
                <p className="text-xs font-semibold text-[#737373] dark:text-gray-400 uppercase tracking-wide">Décennale BTP</p>
              </div>
              <Link
                href="/devis"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="block px-4 py-3.5 text-[#0a0a0a] hover:bg-[#FEF3F0] dark:text-white dark:hover:bg-gray-700 font-medium active:bg-[#FEF3F0] dark:active:bg-gray-700 min-h-[44px] flex items-center whitespace-nowrap"
              >
                Devis décennale — 3 min
              </Link>
              <div className="px-4 py-2 border-b border-[#e5e5e5] dark:border-gray-700">
                <p className="text-xs font-semibold text-[#737373] dark:text-gray-400 uppercase tracking-wide">Dommage ouvrage</p>
              </div>
              <Link
                href="/devis-dommage-ouvrage"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="block px-4 py-3.5 text-[#0a0a0a] hover:bg-[#FEF3F0] dark:text-white dark:hover:bg-gray-700 font-medium active:bg-[#FEF3F0] dark:active:bg-gray-700 min-h-[44px] flex items-center whitespace-nowrap"
              >
                Devis dommage ouvrage — 24h
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile/Tablette: ThemeToggle + Hamburger */}
        <div className="flex lg:hidden items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[#f5f5f5] dark:hover:bg-gray-800 transition-colors"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 text-[#0a0a0a] dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-[#0a0a0a] dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
          <div className="absolute inset-0 bg-black/30" onClick={closeMobile} aria-hidden />
          <nav className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-white dark:bg-gray-900 shadow-2xl p-6 pt-16 flex flex-col gap-1 overflow-y-auto overscroll-contain">
            {navLinks}
          </nav>
        </div>
      )}
    </header>
  )
}
