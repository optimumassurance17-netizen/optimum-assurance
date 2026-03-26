"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import type { SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS, FRAIS_GESTION_PRELEVEMENT } from "@/lib/types"
import type { PeriodicitePrelevement } from "@/lib/types"

/** Échéancier trimestriel uniquement : 1er trimestre + frais (CB), puis 3 × trimestre en SEPA. */
function calculerEcheancierTrimestriel(primeAnnuelle: number) {
  const frais = FRAIS_GESTION_PRELEVEMENT
  const trimestriel = Math.round((primeAnnuelle / 4) * 100) / 100
  const premier = trimestriel + frais
  return {
    nbEcheances: 4,
    premierMontant: premier,
    montantEcheance: trimestriel,
  }
}

interface MandatSepaStored {
  iban: string
  titulaireCompte: string
  periodicite: PeriodicitePrelevement
  primeAnnuelle: number
}

function normalizeMandat(raw: unknown): MandatSepaStored | null {
  if (!raw || typeof raw !== "object") return null
  const m = raw as Record<string, unknown>
  if (typeof m.iban !== "string" || typeof m.titulaireCompte !== "string") return null
  return {
    iban: m.iban,
    titulaireCompte: m.titulaireCompte,
    periodicite: "trimestriel",
    primeAnnuelle: typeof m.primeAnnuelle === "number" ? m.primeAnnuelle : 0,
  }
}

export default function PaiementPage() {
  const router = useRouter()
  const [data, setData] = useState<(SouscriptionData & { signature?: string }) | null>(null)
  const [mandat, setMandat] = useState<MandatSepaStored | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.signature)
    const mandatStored = sessionStorage.getItem(STORAGE_KEYS.mandatSepa)
    if (!stored) {
      router.replace("/devis")
      return
    }
    if (!mandatStored) {
      router.replace("/mandat-sepa")
      return
    }
    try {
      const parsed = JSON.parse(mandatStored)
      const normalized = normalizeMandat(parsed)
      if (normalized) {
        sessionStorage.setItem(STORAGE_KEYS.mandatSepa, JSON.stringify(normalized))
        setMandat(normalized)
      } else {
        router.replace("/mandat-sepa")
        return
      }
      setData(JSON.parse(stored))
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.tarif || !mandat) return

    setLoading(true)
    setError(null)

    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const primeAnnuelle = data.tarif.primeAnnuelle ?? 0
      const amount = calculerEcheancierTrimestriel(primeAnnuelle).premierMontant

      const payload: Record<string, unknown> = {
        amount,
        description: `Assurance décennale — 1er trimestre (CB) - ${data.raisonSociale}`,
        redirectUrl: `${baseUrl}/confirmation`,
        metadata: {
          siret: data.siret,
          raisonSociale: data.raisonSociale,
          email: data.email,
          periodicite: "trimestriel" as const,
          primeAnnuelle: String(primeAnnuelle),
          fraisGestion: String(FRAIS_GESTION_PRELEVEMENT),
          premierPaiementCarte: "true",
          prelevementsSuivantsSepa: "trimestriel",
          /** Pour création mandat SEPA Mollie (webhook) — métadonnées Mollie = chaînes */
          iban: mandat.iban.replace(/\s+/g, ""),
          titulaireCompte: mandat.titulaireCompte,
        },
        customerEmail: data.email,
        method: "creditcard",
      }
      sessionStorage.setItem(
        STORAGE_KEYS.paiementOptions,
        JSON.stringify({
          periodicite: "trimestriel" as const,
          primeAnnuelle,
          premierPaiementCarte: true,
        })
      )

      const res = await fetch("/api/mollie/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Erreur paiement")
      }

      if (result.checkoutUrl) {
        sessionStorage.setItem("mollie_payment_id", result.id)
        window.location.href = result.checkoutUrl
      } else {
        setError("Pas d'URL de paiement reçue")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du paiement")
    } finally {
      setLoading(false)
    }
  }

  if (!data || !mandat) {
    return (
      <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  const ech = calculerEcheancierTrimestriel(data.tarif?.primeAnnuelle ?? 0)

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Breadcrumb items={[
          { label: "Accueil", href: "/" },
          { label: "Devis", href: "/devis" },
          { label: "Souscription", href: "/souscription" },
          { label: "Signature", href: "/signature" },
          { label: "IBAN & SEPA", href: "/mandat-sepa" },
          { label: "Paiement" },
        ]} />
        <Stepper currentStep="paiement" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Paiement
        </h1>
        <p className="text-black mb-6">
          Le premier trimestre (avec frais de gestion) est réglé par <strong>carte bancaire</strong> (Mollie). Les trois trimestres suivants sont prélevés par <strong>SEPA trimestriel</strong> sur l’IBAN du mandat.
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-black mb-3">Récapitulatif de votre souscription</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-black">Société</dt>
              <dd className="font-medium text-black">{data.raisonSociale}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black">SIRET</dt>
              <dd className="font-mono text-black">{data.siret}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black">Activités</dt>
              <dd className="text-black text-right">{data.activites?.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black">Prime annuelle</dt>
              <dd className="font-medium text-black">{data.tarif?.primeAnnuelle?.toLocaleString("fr-FR")} €</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-black mb-3">Coordonnées bancaires (prélèvements suivants)</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-black">IBAN</dt>
              <dd className="font-mono text-black">{mandat.iban.replace(/(.{4})/g, "$1 ").trim()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black">Titulaire</dt>
              <dd className="font-medium text-black">{mandat.titulaireCompte}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black">Périodicité</dt>
              <dd className="font-medium text-black">Trimestriel (4 échéances / an)</dd>
            </div>
          </dl>
          <Link href="/mandat-sepa" className="text-sm text-[#C65D3B] font-medium hover:underline mt-3 inline-block">
            Modifier les coordonnées bancaires
          </Link>
        </div>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          <p className="text-2xl font-bold text-black">
            {ech.premierMontant.toLocaleString("fr-FR")} €
          </p>
          <p className="text-sm text-black">
            1er règlement par <strong>carte bancaire</strong> (1er trimestre + {FRAIS_GESTION_PRELEVEMENT} € de frais de gestion)
          </p>
          <p className="text-sm text-black mt-1">
            Puis <strong>3 prélèvements SEPA trimestriels</strong> de {ech.montantEcheance.toLocaleString("fr-FR")} € sur l’IBAN ci-dessus (mandat SEPA).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-black">
            Paiement sécurisé : 1er trimestre par carte bancaire (Mollie), puis prélèvements SEPA trimestriels sur l’IBAN indiqué.
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !mandat}
            className="w-full bg-[#C65D3B] text-white py-4 rounded-xl hover:bg-[#B04F2F] transition font-medium disabled:bg-[#D4C4BC] disabled:cursor-not-allowed"
          >
            {loading ? "Redirection vers Mollie..." : "Payer le 1er trimestre par carte"}
          </button>
        </form>

        <p className="text-center text-sm text-black mt-6">
          Paiement sécurisé par Mollie
        </p>
      </div>
    </main>
  )
}
