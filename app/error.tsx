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
    <main className="min-h-screen bg-[#FDF8F3] flex flex-col">
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
            className="bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="border-2 border-[#C65D3B] text-[#C65D3B] px-8 py-3 rounded-xl hover:bg-[#FEF3F0] transition font-medium"
          >
            Accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
