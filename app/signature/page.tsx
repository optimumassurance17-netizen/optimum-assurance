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
import { InsuranceContractParcoursBanner } from "@/components/insurance/InsuranceContractParcoursBanner"
import type { InsuranceContractSnapshot } from "@/lib/insurance-contract-types"
import { readResponseJson } from "@/lib/read-response-json"

export default function SignaturePage() {
  const router = useRouter()
  const { status } = useSession()
  const [insuranceSnapshot, setInsuranceSnapshot] = useState<InsuranceContractSnapshot | null>(null)
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
    try {
      const insRaw = sessionStorage.getItem(STORAGE_KEYS.insuranceContract)
      if (insRaw) {
        const parsed = JSON.parse(insRaw) as InsuranceContractSnapshot
        if (parsed?.contractId && parsed?.contractNumber && parsed?.status) {
          setInsuranceSnapshot(parsed)
        }
      }
    } catch {
      /* ignore */
    }
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

  const handleSignContract = async () => {
    if (!souscription) return

    setLoading(true)
    setError(null)

    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "signature",
          produit: souscription.insuranceProduct === "do" ? "dommage-ouvrage" : "decennale",
        }),
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

      const result = await readResponseJson<{
        error?: string
        signatureRequestId?: string
        contractNumero?: string
        contractData?: string
        signatureLink?: string
      }>(res)

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
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis", href: "/devis" }, { label: "Souscription", href: "/souscription" }, { label: "Signature" }]} />
        <Stepper currentStep="signature" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          {souscription.insuranceProduct === "do" ? "Prochaine étape" : "Signature numérique"}
        </h1>
        <p className="text-[#171717] mb-8">
          {souscription.insuranceProduct === "do"
            ? "Votre dossier dommage ouvrage est pris en charge. Le contrat plateforme et les paiements sont gérés depuis votre espace client."
            : "Signez électroniquement votre contrat d’assurance décennale sur notre page de signature sécurisée."}
        </p>

        {insuranceSnapshot ? <InsuranceContractParcoursBanner snapshot={insuranceSnapshot} /> : null}

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          <h3 className="font-medium text-black mb-4">
            Récapitulatif du contrat
          </h3>
          <ul className="space-y-2 text-[#171717] text-sm">
            <li>Assuré : {souscription.raisonSociale}</li>
            {souscription.insuranceProduct === "do" && souscription.doProjectName ? (
              <>
                <li>Chantier : {souscription.doProjectName}</li>
                {souscription.doProjectAddress ? <li>Adresse chantier : {souscription.doProjectAddress}</li> : null}
              </>
            ) : null}
            <li>
              Prime :{" "}
              {souscription.tarif?.primeMensuelle != null
                ? `${souscription.tarif.primeMensuelle.toLocaleString("fr-FR")} €/mois`
                : souscription.tarif?.primeAnnuelle != null
                  ? `${Math.round((souscription.tarif.primeAnnuelle / 12) * 100) / 100} €/mois`
                  : "—"}{" "}
              (équivalent
              {souscription.tarif?.primeAnnuelle != null
                ? ` · ${souscription.tarif.primeAnnuelle.toLocaleString("fr-FR")} €/an`
                : ""}
              )
              {souscription.insuranceProduct === "do"
                ? " — indicative (contrat plateforme)"
                : ` — prélèvement ${souscription.tarif?.primeTrimestrielle ?? (souscription.tarif?.primeAnnuelle ? Math.round((souscription.tarif.primeAnnuelle / 4) * 100) / 100 : "—")} €/trimestre`}
            </li>
            {souscription.insuranceProduct !== "do" ? (
              <li>Activités : {souscription.activites?.join(", ") || "—"}</li>
            ) : (
              <li>Produit : dommage ouvrage (plateforme)</li>
            )}
          </ul>
        </div>

        {souscription.insuranceProduct === "do" ? (
          <div className="bg-[#ebe6e0] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
            <p className="text-sm text-[#171717]">
              La signature ci-dessous concerne le modèle de contrat historique décennale BTP. Pour le dommage
              ouvrage, suivez votre contrat et les attestations dans l&apos;espace client après validation assureur et
              paiement.
            </p>
          </div>
        ) : null}

        <DevoirConseil
          produit={souscription.insuranceProduct === "do" ? "dommage-ouvrage" : "decennale"}
          checkboxId="devoir-conseil-signature"
          checked={devoirConseilAccepte}
          onCheckedChange={setDevoirConseilAccepte}
          labelCheckbox={
            souscription.insuranceProduct === "do"
              ? "Je confirme avoir pris connaissance du récapitulatif et des informations sur la suite du dossier dommage ouvrage."
              : "Je confirme avoir pris connaissance du récapitulatif, des garanties et exclusions avant de signer."
          }
        />

        <div className="bg-[#ebe6e0] border border-[#d4d4d4] rounded-2xl p-6 mb-8 mt-6">
          <p className="text-sm text-[#171717] mb-4">
            {souscription.insuranceProduct === "do"
              ? "Vous pouvez signer le contrat type décennale ci-dessous si votre conseiller vous y a invité ; sinon rendez-vous dans l'espace client pour le dossier dommage ouvrage."
              : "Vous serez redirigé vers la page de signature pour apposer votre signature sur le PDF. Poursuivez ensuite vers le mandat SEPA et le paiement."}
          </p>
          <button
            type="button"
            onClick={handleSignContract}
            disabled={loading || !devoirConseilAccepte}
            className="w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? "Préparation en cours..." : "Signer le contrat (contrat type)"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
            {error}
          </div>
        )}

        <p className="text-center text-sm text-[#171717]">
          <Link href="/souscription" className="text-[#2563eb] hover:underline">
            Retour à la souscription
          </Link>
        </p>
      </div>
    </main>
  )
}
