"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const STORAGE_KEY = "optimum-cookies-consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }))
    setVisible(false)
  }

  const refuse = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-[#e5e5e5] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-4 md:p-6"
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
    >
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h2 id="cookie-title" className="font-semibold text-[#0a0a0a] mb-1">
            Cookies et confidentialité
          </h2>
          <p id="cookie-desc" className="text-sm text-[#171717]">
            Nous utilisons des cookies techniques nécessaires au fonctionnement du site (session, authentification).
            Aucun cookie publicitaire.{" "}
            <Link href="/confidentialite" className="text-[#C65D3B] font-medium hover:underline">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={refuse}
            className="px-5 py-2.5 border-2 border-[#d4d4d4] rounded-xl font-medium text-[#171717] hover:bg-[#f5f5f5] transition-colors"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-5 py-2.5 bg-[#C65D3B] text-white rounded-xl font-medium hover:bg-[#B04F2F] transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
