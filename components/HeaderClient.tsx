"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { ThemeToggle } from "@/components/ThemeToggle"

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

        <nav className="flex items-center gap-2 sm:gap-4 shrink-0" aria-label="Navigation principale">
          <ThemeToggle />
          <Link href="/devis-dommage-ouvrage" className="hidden md:flex text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center justify-center transition-colors">
            Dommage ouvrage
          </Link>
          <Link href="/faq" className="text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 flex items-center justify-center transition-colors">
            FAQ
          </Link>
          <Link href="/guides" className="hidden sm:flex text-[#171717] hover:text-[#0a0a0a] dark:text-gray-200 dark:hover:text-white font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 items-center justify-center transition-colors">
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
              <span className="hidden sm:inline">Obtenir un devis </span>
              <span className="sm:hidden">Devis</span>
              <span className="text-sm" aria-hidden="true">▾</span>
            </button>
            <div
              id="devis-menu"
              role="menu"
              aria-labelledby="devis-trigger"
              className={`absolute right-0 mt-1 py-2 min-w-[260px] w-72 bg-white rounded-xl border border-[#e5e5e5] shadow-xl transition-all z-[60] dark:bg-gray-800 dark:border-gray-700 ${
                devisOpen ? "opacity-100 visible" : "opacity-0 invisible"
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
      </div>
    </header>
  )
}
