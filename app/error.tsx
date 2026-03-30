"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-6xl mb-4" aria-hidden>⚠️</p>
        <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-2">Une erreur est survenue</h1>
        <p className="text-[#171717] mb-8 text-center max-w-md">
          Désolé, une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou retourner à l&apos;accueil.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-[#2563eb] text-white px-8 py-3 rounded-xl hover:bg-[#1d4ed8] transition font-medium"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="border-2 border-[#2563eb] text-[#2563eb] px-8 py-3 rounded-xl hover:bg-[#eff6ff] transition font-medium"
          >
            Accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
