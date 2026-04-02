"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { readResponseJson } from "@/lib/read-response-json"

interface SuspendedAttestation {
  id: string
  numero: string
  raisonSociale: string
  montantDu: number
}

export default function RegularisationPage() {
  const { status } = useSession()
  const router = useRouter()
  const [attestations, setAttestations] = useState<SuspendedAttestation[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/espace-client/regularisation")
      return
    }
    if (status !== "authenticated") return

    const fetchSuspended = async () => {
      try {
        const res = await fetch("/api/documents/suspended")
        if (res.ok) {
          const data = await readResponseJson<SuspendedAttestation[]>(res)
          setAttestations(data)
        }
      } catch {
        setAttestations([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuspended()
  }, [status, router])

  const handlePay = async (att: SuspendedAttestation) => {
    setPayingId(att.id)
    setError(null)
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const res = await fetch("/api/mollie/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: att.montantDu,
          description: `Régularisation - ${att.raisonSociale} (${att.numero})`,
          redirectUrl: `${baseUrl}/confirmation?regularisation=1`,
          metadata: {
            type: "regularisation",
            attestationId: att.id,
            attestationNumero: att.numero,
          },
          customerEmail: undefined,
          method: "creditcard",
        }),
      })
      const result = await readResponseJson<{
        error?: string
        checkoutUrl?: string
        id?: string
      }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      if (result.checkoutUrl) {
        sessionStorage.setItem("mollie_payment_id", result.id ?? "")
        sessionStorage.setItem("mollie_regularisation_attestation", att.id)
        window.location.href = result.checkoutUrl
      } else {
        throw new Error("Pas d'URL de paiement")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du paiement")
    } finally {
      setPayingId(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/espace-client" className="text-[#2563eb] hover:underline mb-6 inline-block">
          ← Retour à l&apos;espace client
        </Link>

        <h1 className="text-3xl font-semibold mb-2 text-black">
          Régularisation de paiement
        </h1>
        <p className="text-[#171717] mb-8">
          Paiement par carte bancaire pour régulariser un impayé (Mollie).
        </p>

        {attestations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-[#171717] mb-4">
              Aucune attestation en attente de régularisation.
            </p>
            <Link href="/espace-client" className="text-[#2563eb] hover:underline font-medium">
              Retour à l&apos;espace client
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {attestations.map((att) => (
              <div
                key={att.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-black">{att.raisonSociale}</p>
                  <p className="text-sm text-[#171717]">Attestation {att.numero}</p>
                  <p className="text-lg font-bold text-[#2563eb] mt-2">
                    {att.montantDu.toLocaleString("fr-FR")} € à régler
                  </p>
                </div>
                <button
                  onClick={() => handlePay(att)}
                  disabled={payingId !== null}
                  className="bg-[#2563eb] text-white px-6 py-3 rounded-xl hover:bg-[#1d4ed8] font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {payingId === att.id ? "Redirection..." : "Payer par CB"}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <p className="text-center text-sm text-[#171717] mt-8">
          Paiement sécurisé par Mollie
        </p>
      </div>
    </main>
  )
}
