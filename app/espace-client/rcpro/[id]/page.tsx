"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import type { RcProQuoteRecord } from "@/src/modules/rcpro/types/rcpro.types"

export default function RcProClientQuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const quoteId = params?.id ?? ""
  const router = useRouter()
  const [quote, setQuote] = useState<RcProQuoteRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteId) {
      setError("Devis introuvable.")
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/rcpro/get-quote-by-id?id=${encodeURIComponent(quoteId)}`, {
          cache: "no-store",
        })
        const json = (await res.json()) as { quote?: RcProQuoteRecord; error?: string }
        if (!res.ok) {
          setError(json.error ?? "Impossible de charger le devis RC Pro.")
          return
        }
        if (!json.quote) {
          setError("Devis introuvable.")
          return
        }
        setQuote(json.quote)
      } catch {
        setError("Erreur réseau lors du chargement du devis RC Pro.")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [quoteId])

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl">Chargement du devis RC Pro...</div>
      </main>
    )
  }

  if (!quote) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error ?? "Devis introuvable."}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push("/espace-client/rcpro")}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-sm text-[#555]">
          <Link href="/espace-client" className="hover:underline">
            Espace client
          </Link>{" "}
          /{" "}
          <Link href="/espace-client/rcpro" className="hover:underline">
            RC Pro
          </Link>{" "}
          / {quote.id}
        </div>

        <section className="rounded-2xl border border-[#d4d4d4] bg-[#f8fafc] p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#0a0a0a]">Détail du devis RC Pro</h1>
          <p className="mt-1 text-sm text-[#666]">ID dossier : {quote.id}</p>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-[#666]">Activité</dt>
              <dd className="font-medium text-[#0a0a0a]">{quote.activity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#666]">Statut</dt>
              <dd className="font-medium text-[#0a0a0a]">{quote.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#666]">Chiffre d&apos;affaires</dt>
              <dd className="font-medium text-[#0a0a0a]">{Number(quote.revenue).toLocaleString("fr-FR")} €</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#666]">Employés</dt>
              <dd className="font-medium text-[#0a0a0a]">{quote.employees}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-[#666]">Prime calculée</dt>
              <dd className="text-xl font-bold text-[#2563eb]">{Number(quote.price).toLocaleString("fr-FR")} €</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-[#666]">Créé le</dt>
              <dd className="font-medium text-[#0a0a0a]">
                {new Date(quote.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  )
}
