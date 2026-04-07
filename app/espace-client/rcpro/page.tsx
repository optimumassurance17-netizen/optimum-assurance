"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { RcProQuoteRecord } from "@/src/modules/rcpro/types/rcpro.types"

type QuotesResponse = { quotes: RcProQuoteRecord[] }

export default function RcProClientSpacePage() {
  const { status } = useSession()
  const [quotes, setQuotes] = useState<RcProQuoteRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== "authenticated") return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/rcpro/get-user-quotes", { method: "GET" })
        const data = (await res.json()) as QuotesResponse | { error?: string }
        if (!res.ok || !("quotes" in data)) {
          setError("Impossible de charger vos devis RC Pro.")
          return
        }
        setQuotes(data.quotes)
      } catch {
        setError("Erreur réseau.")
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [status])

  if (status === "loading") {
    return <main className="mx-auto max-w-4xl p-6">Chargement...</main>
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold mb-3">Espace client RC Pro</h1>
        <p className="text-sm opacity-80 mb-4">Connectez-vous pour consulter vos devis et contrats RC Pro.</p>
        <Link className="underline" href="/connexion?callbackUrl=/espace-client/rcpro">
          Se connecter
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-2">Espace client RC Pro</h1>
      <p className="text-sm opacity-80 mb-6">
        Base prête pour évolution : devis, contrats actifs, documents PDF, attestations et paiements.
      </p>

      {loading && <p>Chargement des devis...</p>}
      {!loading && error && <p className="text-red-700">{error}</p>}
      {!loading && !error && quotes.length === 0 && (
        <div className="rounded border p-4">
          <p className="mb-3">Aucun devis RC Pro pour le moment.</p>
          <Link href="/devis/rcpro" className="underline">
            Créer un devis RC Pro
          </Link>
        </div>
      )}

      {!loading && !error && quotes.length > 0 && (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id} className="rounded border p-4">
              <p className="font-medium">{quote.activity}</p>
              <p className="text-sm opacity-80">
                {quote.price.toLocaleString("fr-FR")} € — {quote.status}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Créé le {new Date(quote.created_at).toLocaleString("fr-FR")}
              </p>
              <Link href={`/espace-client/rcpro/${quote.id}`} className="underline mt-2 inline-block">
                Voir le détail
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
