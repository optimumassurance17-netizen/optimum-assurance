"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const HIDDEN_PREFIXES = ["/gestion", "/admin", "/v/"]

export function StickyMobileCta() {
  const pathname = usePathname() || ""

  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api")

  useEffect(() => {
    if (hidden || typeof document === "undefined") return
    const main = document.getElementById("main-content")
    if (!main) return
    main.classList.add("pb-[6.75rem]", "md:pb-0")
    return () => {
      main.classList.remove("pb-[6.75rem]", "md:pb-0")
    }
  }, [hidden, pathname])

  if (hidden) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Actions rapides"
    >
      <div className="flex gap-2 px-3 pt-2">
        <Link
          href="/devis"
          className="flex-1 rounded-xl bg-blue-600 py-3.5 text-center font-semibold text-white shadow-md shadow-blue-600/25 transition-transform active:scale-[0.98]"
        >
          Devis décennale
        </Link>
        <Link
          href="/devis-dommage-ouvrage"
          className="flex-1 rounded-xl border-2 border-blue-600 py-3.5 text-center font-semibold text-blue-600 transition-transform active:scale-[0.98]"
        >
          Devis DO
        </Link>
      </div>
    </div>
  )
}
