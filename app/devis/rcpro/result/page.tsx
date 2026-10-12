"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/Header"
import { DevoirConseil } from "@/components/DevoirConseil"

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
  const [accepted, setAccepted] = useState(false)
  const [logged, setLogged] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const onCheckedChange = async (checked: boolean) => {
    setAccepted(checked)
    setLogError(null)
    if (!checked || logged) return
    const priceLabel = price != null ? `${price.toLocaleString("fr-FR")} EUR` : ""
    try {
      const response = await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "rc_pro_result",
          produit: "rc-pro",
          sourcePage: "rc_pro_result",
          sourcePath: "/devis/rcpro/result",
          needsSummary: [
            "RC Pro",
            quoteId ? `devis ${quoteId}` : null,
            priceLabel || null,
          ]
            .filter(Boolean)
            .join(" | "),
          recommendedProduct: "rc-pro",
          suitabilityScore: 0.9,
          context: {
            quoteId: quoteId || null,
            price,
          },
        }),
      })
      if (!response.ok) {
        setAccepted(false)
        setLogError("La confirmation n'a pas pu être enregistrée. Cochez à nouveau la case.")
        return
      }
      setLogged(true)
    } catch {
      setAccepted(false)
      setLogError("La confirmation n'a pas pu être enregistrée. Cochez à nouveau la case.")
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-[#0a0a0a]">Devis RC Pro — Résultat</h1>
        <p className="mb-8 text-sm text-[#475569]">
          Responsabilité civile professionnelle (hors bâtiment)
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
              <p className="text-sm text-[#475569]">Tarif estimé TTC</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">{price.toLocaleString("fr-FR")} EUR</p>
              {quoteId && <p className="mt-2 text-xs text-[#64748b]">Référence devis : {quoteId}</p>}
              <p className="mt-4 text-xs text-[#64748b]">
                Ce résultat est indicatif et soumis à validation finale du dossier.
              </p>
              <Link href="/devis/rcpro" className="mt-6 inline-block text-sm font-medium text-[#2563eb]">
                Recalculer un autre devis
              </Link>
            </>
          )}
        </section>

        <div className="mt-6">
          <DevoirConseil
            produit="rc-pro"
            checkboxId="devoir-conseil-rcpro"
            checked={accepted}
            onCheckedChange={(checked) => void onCheckedChange(checked)}
            labelCheckbox="Je confirme avoir pris connaissance du devoir de conseil pour cette RC Pro."
          />
          {logged ? (
            <p className="mt-3 text-sm font-medium text-[#166534]">Confirmation enregistrée.</p>
          ) : null}
          {logError ? <p className="mt-3 text-sm font-medium text-red-700">{logError}</p> : null}
        </div>
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
            <p className="text-sm text-[#475569]">Chargement du résultat...</p>
          </div>
        </main>
      }
    >
      <RcProResultContent />
    </Suspense>
  )
}
