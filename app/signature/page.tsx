"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DevoirConseil } from "@/components/DevoirConseil"
import type { SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"

export default function SignaturePage() {
  const router = useRouter()
  const { status } = useSession()
  const [souscription, setSouscription] = useState<SouscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?from=signature")
      return
    }
  }, [status, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.signature) || sessionStorage.getItem(STORAGE_KEYS.souscription)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      const data = JSON.parse(stored) as SouscriptionData
      setSouscription(data)
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleSignWithYousign = async () => {
    if (!souscription) return

    setLoading(true)
    setError(null)

    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "signature", produit: "decennale" }),
      })
    } catch {
      /* non bloquant */
    }

    try {
      const res = await fetch("/api/yousign/create-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ souscription }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la création de la signature")
      }

      const dataWithSignature = {
        ...souscription,
        yousignSignatureRequestId: result.signatureRequestId,
        yousignContractNumero: result.contractNumero,
        yousignContractData: result.contractData,
        dateSignature: new Date().toISOString(),
      }
      sessionStorage.setItem(STORAGE_KEYS.signature, JSON.stringify(dataWithSignature))

      if (result.signatureLink) {
        window.location.href = result.signatureLink
      } else {
        throw new Error("Lien de signature non reçu")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
      setLoading(false)
    }
  }

  if (status === "loading" || !souscription) {
    return (
      <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis", href: "/devis" }, { label: "Souscription", href: "/souscription" }, { label: "Signature" }]} />
        <Stepper currentStep="signature" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Signature numérique
        </h1>
        <p className="text-[#171717] mb-8">
          Signez électroniquement votre contrat d&apos;assurance décennale avec Yousign, solution certifiée eIDAS.
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          <h3 className="font-medium text-black mb-4">
            Récapitulatif du contrat
          </h3>
          <ul className="space-y-2 text-[#171717] text-sm">
            <li>Assuré : {souscription.raisonSociale}</li>
            <li>Prime : {souscription.tarif?.primeMensuelle} € / mois</li>
            <li>Activités : {souscription.activites?.join(", ") || "—"}</li>
          </ul>
        </div>

        <DevoirConseil
          produit="decennale"
          checkboxId="devoir-conseil-signature"
          checked={devoirConseilAccepte}
          onCheckedChange={setDevoirConseilAccepte}
          labelCheckbox="Je confirme avoir pris connaissance du récapitulatif, des garanties et exclusions avant de signer."
        />

        <div className="bg-[#ebe6e0] border border-[#d4d4d4] rounded-2xl p-6 mb-8 mt-6">
          <p className="text-sm text-[#171717] mb-4">
            Vous serez redirigé vers la plateforme Yousign pour signer votre contrat. La signature électronique a la même valeur juridique qu&apos;une signature manuscrite.
          </p>
          <button
            type="button"
            onClick={handleSignWithYousign}
            disabled={loading || !devoirConseilAccepte}
            className="w-full bg-[#C65D3B] text-white py-4 rounded-xl hover:bg-[#B04F2F] transition font-medium disabled:bg-[#D4C4BC] disabled:cursor-not-allowed"
          >
            {loading ? "Préparation en cours..." : "Signer avec Yousign"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
            {error}
          </div>
        )}

        <p className="text-center text-sm text-[#171717]">
          <Link href="/souscription" className="text-[#C65D3B] hover:underline">
            Retour à la souscription
          </Link>
        </p>
      </div>
    </main>
  )
}
