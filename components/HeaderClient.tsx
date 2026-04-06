"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  )
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

export function HeaderClient() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [devisOpen, setDevisOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const devisRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false))
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", onEscape)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onEscape)
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

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
    <header className="relative z-50 overflow-visible border-b border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 md:px-8 sm:py-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-0">
        <div className="flex justify-between items-center gap-3 min-w-0">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">RC fabriquant</p>
              </div>
              <Link
                href="/devis-rc-fabriquant"
                role="menuitem"
                onClick={() => setDevisOpen(false)}
                className="flex min-h-[44px] items-center whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 hover:bg-teal-50 active:bg-teal-50"
              >
                Demande RC fabriquant — étude
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

          <button
            type="button"
            className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm touch-manipulation"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile / tablette : menu vertical (lisible, sans scroll horizontal dans le header) */}
        <nav
          id="mobile-nav-menu"
          className={`lg:hidden border-t border-slate-200/90 bg-white ${mobileOpen ? "max-h-[min(85vh,560px)] overflow-y-auto py-3" : "hidden"}`}
          aria-hidden={!mobileOpen}
        >
          <div className="flex flex-col gap-1 pt-1">
            <Link
              href="/devis"
              className="rounded-xl bg-blue-600 px-4 py-3.5 text-center text-base font-semibold text-white active:bg-blue-700"
              onClick={() => setMobileOpen(false)}
            >
              Devis décennale
            </Link>
            <Link
              href="/devis-rc-fabriquant"
              className="rounded-xl bg-teal-50 px-4 py-3.5 text-center text-base font-semibold text-teal-800 active:bg-teal-100"
              onClick={() => setMobileOpen(false)}
            >
              RC fabriquant
            </Link>
            <Link
              href="/devis-dommage-ouvrage"
              className="rounded-xl bg-blue-50 px-4 py-3.5 text-center text-base font-semibold text-blue-700 active:bg-blue-100"
              onClick={() => setMobileOpen(false)}
            >
              Dommage ouvrage
            </Link>
            <Link
              href="/faq"
              className="rounded-xl px-4 py-3.5 text-base font-medium text-slate-800 active:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              FAQ
            </Link>
            <Link
              href="/guides"
              className="rounded-xl px-4 py-3.5 text-base font-medium text-slate-800 active:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              Guides
            </Link>
            <Link
              href="/espace-client"
              className="rounded-xl border-2 border-blue-600 px-4 py-3.5 text-center text-base font-semibold text-blue-600 active:bg-blue-50"
              onClick={() => setMobileOpen(false)}
            >
              Espace client
            </Link>
            {status === "authenticated" && session && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  signOut({ callbackUrl: "/" })
                }}
                className="rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 active:bg-slate-50"
              >
                Déconnexion
              </button>
            )}
          </div>
        </nav>
      </div>

    </header>
  )
}
