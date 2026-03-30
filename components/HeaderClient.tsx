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
    <header className="relative z-50 overflow-visible border-b border-slate-200/90 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6 md:px-8 sm:py-5">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-600/25 sm:h-10 sm:w-10">
            <span className="font-bold text-white">O</span>
          </div>
          <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl">
            Optimum
          </span>
        </Link>

        {/* Desktop nav — uniquement sur grands écrans (lg+) pour éviter le dropdown buggé sur mobile/tablette */}
        <nav className="hidden lg:flex items-center gap-2 sm:gap-4 shrink-0" aria-label="Navigation principale">
          <Link href="/devis-dommage-ouvrage" className="-my-2 flex min-h-[44px] items-center justify-center px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 sm:px-0 sm:py-0">
            Dommage ouvrage
          </Link>
          <Link href="/faq" className="text-[#171717] hover:text-[#0a0a0a] font-medium text-sm sm:text-base px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] min-w-[44px] sm:min-w-0 flex items-center justify-center transition-colors">
            FAQ
          </Link>
          <Link href="/guides" className="-my-2 flex min-h-[44px] min-w-[44px] items-center justify-center px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 sm:min-w-0 sm:px-0 sm:py-0 sm:text-base">
            Guides
          </Link>
          <Link
            href="/espace-client"
            className="flex min-h-[44px] items-center rounded-xl border-2 border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white sm:px-4 sm:text-base"
          >
            Espace client
          </Link>
          {status === "authenticated" && session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[#333333] hover:text-[#2563eb] font-medium text-sm px-2 py-2 -my-2 sm:px-0 sm:py-0 min-h-[44px] flex items-center transition-colors"
            >
              Déconnexion
            </button>
          )}
          <div className="relative" ref={devisRef} role="group" aria-label="Obtenir un devis">
            <button
              type="button"
              onClick={() => setDevisOpen((o) => !o)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 sm:px-6 sm:text-base"
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
              className={`absolute right-0 top-full z-[60] mt-1 min-w-[260px] w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-xl transition-all ${
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
                className="block px-4 py-3.5 text-[#0a0a0a] hover:bg-[#eff6ff] font-medium active:bg-[#eff6ff] min-h-[44px] flex items-center whitespace-nowrap"
              >
                Devis décennale — 3 min
              </Link>
              <div className="border-b border-slate-200 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Dommage ouvrage</p>
              </div>
              <Link
                href="/devis-dommage-ouvrage"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="flex min-h-[44px] items-center whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 hover:bg-blue-50 active:bg-blue-50"
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
            className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white"
          >
            Décennale
          </Link>
          <Link
            href="/devis-dommage-ouvrage"
            className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white"
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
            className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-2 border-blue-600 px-2.5 py-2 text-xs font-semibold text-blue-600"
          >
            Espace client
          </Link>
          {status === "authenticated" && session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="min-h-[44px] shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 hover:text-blue-600"
            >
              Déconnexion
            </button>
          )}
        </nav>
      </div>

    </header>
  )
}
