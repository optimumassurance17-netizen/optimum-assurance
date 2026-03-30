"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DevoirConseil } from "@/components/DevoirConseil"
import type { DoSouscriptionInsurancePayload } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { doPayloadToSouscriptionShim } from "@/lib/build-do-souscription-payload"
import { runInsuranceContractStepAfterSouscription } from "@/lib/souscription-insurance-contract"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"

export default function SouscriptionDommageOuvragePage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [payload, setPayload] = useState<DoSouscriptionInsurancePayload | null>(null)
  const [representantLegal, setRepresentantLegal] = useState("")
  const [civilite, setCivilite] = useState<"M" | "Mme" | "Mlle">("M")
  const [dateCreationSociete, setDateCreationSociete] = useState("")
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [insuranceLoading, setInsuranceLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = sessionStorage.getItem(STORAGE_KEYS.doSouscription)
    if (!raw) {
      router.replace("/devis-dommage-ouvrage")
      return
    }
    try {
      const p = JSON.parse(raw) as DoSouscriptionInsurancePayload
      if (p.productType !== "do" || !p.email) {
        router.replace("/devis-dommage-ouvrage")
        return
      }
      setPayload(p)
      setRepresentantLegal(p.representantLegal?.trim() || "")
      setCivilite(p.civilite ?? "M")
      setDateCreationSociete(p.dateCreationSociete ?? "")
    } catch {
      router.replace("/devis-dommage-ouvrage")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payload || !representantLegal.trim() || !devoirConseilAccepte) return

    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "souscription_do", produit: "dommage-ouvrage", email: payload.email }),
      })
    } catch {
      /* non bloquant */
    }

    const merged: DoSouscriptionInsurancePayload = {
      ...payload,
      representantLegal: representantLegal.trim(),
      civilite,
      dateCreationSociete: dateCreationSociete.trim() || undefined,
    }
    sessionStorage.setItem(STORAGE_KEYS.doSouscription, JSON.stringify(merged))
    sessionStorage.setItem(STORAGE_KEYS.souscription, JSON.stringify(doPayloadToSouscriptionShim(merged)))

    if (sessionStatus === "authenticated") {
      setInsuranceLoading(true)
      try {
        const ins = await runInsuranceContractStepAfterSouscription(merged)
        if (ins.outcome === "mollie_redirect") {
          window.location.href = ins.checkoutUrl
          return
        }
      } finally {
        setInsuranceLoading(false)
      }
      router.push("/signature")
      return
    }

    router.push("/creer-compte")
  }

  if (!payload) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Devis DO", href: "/devis-dommage-ouvrage" },
            { label: "Souscription" },
          ]}
        />
        <Stepper currentStep="souscription" />
        <h1 className="text-3xl font-semibold mb-2 text-black">Souscription dommage ouvrage</h1>
        <p className="text-[#171717] mb-8">
          Complétez les informations pour créer votre contrat plateforme (après création de compte : paiement sécurisé
          Mollie si le dossier est accepté).
        </p>

        <div className="bg-[#ebe0db] border border-[#d4c9c4] rounded-xl p-4 mb-8">
          <p className="font-medium text-black">Prime indicative : {payload.premium.toLocaleString("fr-FR")} € / an</p>
          <p className="text-sm text-[#171717] mt-1">Chantier : {payload.projectName}</p>
          <p className="text-sm text-[#171717]">{payload.projectAddress}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] space-y-4">
            <p className="text-sm text-black">
              <strong>{payload.raisonSociale}</strong> — SIRET {payload.siret}
            </p>
            <div>
              <label htmlFor="do-rep" className="block mb-2 font-medium text-black">
                Représentant légal *
              </label>
              <input
                id="do-rep"
                type="text"
                required
                value={representantLegal}
                onChange={(e) => setRepresentantLegal(e.target.value)}
                className={`w-full rounded-xl px-4 py-3.5 font-semibold ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
            <div>
              <label htmlFor="do-civ" className="block mb-2 font-medium text-black">
                Civilité
              </label>
              <select
                id="do-civ"
                value={civilite}
                onChange={(e) => setCivilite(e.target.value as "M" | "Mme" | "Mlle")}
                className={`w-full rounded-xl px-4 py-3.5 font-semibold ${inputFieldBg} ${inputTextDark}`}
              >
                <option value="M">M.</option>
                <option value="Mme">Mme</option>
                <option value="Mlle">Mlle</option>
              </select>
            </div>
            <div>
              <label htmlFor="do-date-creat" className="block mb-2 font-medium text-black">
                Date de création de la société (optionnel, AAAA-MM-JJ)
              </label>
              <input
                id="do-date-creat"
                type="text"
                placeholder="2018-01-15"
                value={dateCreationSociete}
                onChange={(e) => setDateCreationSociete(e.target.value)}
                className={`w-full rounded-xl px-4 py-3.5 font-semibold ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
          </div>

          <DevoirConseil
            produit="dommage-ouvrage"
            checkboxId="devoir-conseil-souscription-do"
            checked={devoirConseilAccepte}
            onCheckedChange={setDevoirConseilAccepte}
            labelCheckbox="Je confirme avoir reçu le devoir de conseil pour cette souscription dommage ouvrage."
          />

          <button
            type="submit"
            disabled={insuranceLoading || !devoirConseilAccepte}
            className="w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {insuranceLoading ? "Traitement…" : sessionStatus === "authenticated" ? "Valider et continuer" : "Créer mon compte et continuer"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/devis-dommage-ouvrage" className="text-[#2563eb] hover:underline">
            Retour au formulaire de devis
          </Link>
        </p>
      </div>
    </main>
  )
}
