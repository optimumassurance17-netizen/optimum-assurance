"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/Header"
import { DEVOIR_CONSEIL_TEXT_BY_PRODUCT, getDevoirConseilLinksLine } from "@/lib/devoir-conseil"

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100) / 100
}

function RcProResultContent() {
  const searchParams = useSearchParams()
  const quoteId = searchParams?.get("id")?.trim() || ""
  const price = parsePrice(searchParams?.get("price") ?? null)
  const devoirConseil = DEVOIR_CONSEIL_TEXT_BY_PRODUCT.rc_fabriquant

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-[#0a0a0a]">Devis RC Pro — Resultat</h1>
        <p className="mb-8 text-sm text-[#475569]">
          Responsabilite Civile Professionnelle (hors batiment)
        </p>

        <section className="rounded-xl border border-[#d4d4d8] bg-white p-6 shadow-sm">
          {price == null ? (
            <>
              <p className="text-sm text-[#475569]">Aucun tarif transmis.</p>
              <Link href="/devis/rcpro" className="mt-4 inline-block text-sm font-medium text-[#2563eb]">
                Retour au formulaire RC Pro
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-[#475569]">Tarif estime TTC</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">{price.toLocaleString("fr-FR")} EUR</p>
              {quoteId && <p className="mt-2 text-xs text-[#64748b]">Reference devis : {quoteId}</p>}
              <p className="mt-4 text-xs text-[#64748b]">
                Ce resultat est indicatif et soumis a validation finale du dossier.
              </p>
              <Link href="/devis/rcpro" className="mt-6 inline-block text-sm font-medium text-[#2563eb]">
                Recalculer un autre devis
              </Link>
            </>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-[#d4d4d8] bg-[#f8fafc] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{devoirConseil.titre}</h2>
          <p className="mt-3 text-sm text-[#171717]">{devoirConseil.contenu}</p>
          <p className="mt-3 text-xs text-[#64748b]">{getDevoirConseilLinksLine("rc_fabriquant")}</p>
        </section>
      </div>
    </main>
  )
}

export default function RcProResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)]">
          <Header />
          <div className="mx-auto max-w-3xl px-4 py-12">
            <p className="text-sm text-[#475569]">Chargement du resultat...</p>
          </div>
        </main>
      }
    >
      <RcProResultContent />
    </Suspense>
  )
}
