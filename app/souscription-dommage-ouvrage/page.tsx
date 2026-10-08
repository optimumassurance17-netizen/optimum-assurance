"use client"

import { useState, useEffect, useRef } from "react"
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
import { trackConversion } from "@/lib/conversion-tracking"

export default function SouscriptionDommageOuvragePage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [payload, setPayload] = useState<DoSouscriptionInsurancePayload | null>(null)
  const [representantLegal, setRepresentantLegal] = useState("")
  const [civilite, setCivilite] = useState<"M" | "Mme" | "Mlle">("M")
  const [dateCreationSociete, setDateCreationSociete] = useState("")
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [insuranceLoading, setInsuranceLoading] = useState(false)
  const [resumeState, setResumeState] = useState<"loading" | "ready" | "missing">("loading")
  const hydrated = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hydrated.current) return

    const apply = (p: DoSouscriptionInsurancePayload) => {
      setPayload(p)
      setRepresentantLegal(p.representantLegal?.trim() || p.raisonSociale || "")
      setCivilite(p.civilite ?? "M")
      setDateCreationSociete(p.dateCreationSociete ?? "")
      setResumeState("ready")
      hydrated.current = true
      trackConversion("souscription_started", { product: "do", source: "do-online" })
    }

    const raw = sessionStorage.getItem(STORAGE_KEYS.doSouscription)
    if (raw) {
      try {
        const p = JSON.parse(raw) as DoSouscriptionInsurancePayload
        if (p.productType === "do" && p.email) {
          apply(p)
          return
        }
      } catch {
        /* reprise serveur */
      }
    }

    if (sessionStatus === "loading") return
    if (sessionStatus !== "authenticated") {
      router.replace(`/connexion?callbackUrl=${encodeURIComponent("/souscription-dommage-ouvrage")}`)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/client/do-souscription")
        const json = (await res.json().catch(() => ({}))) as {
          payload?: DoSouscriptionInsurancePayload | null
        }
        if (cancelled) return
        const p = json.payload
        if (res.ok && p?.productType === "do" && p.email) {
          sessionStorage.setItem(STORAGE_KEYS.doSouscription, JSON.stringify(p))
          apply(p)
          return
        }
      } catch {
        /* demande introuvable */
      }
      if (!cancelled) {
        hydrated.current = true
        setResumeState("missing")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, sessionStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payload || !representantLegal.trim() || !devoirConseilAccepte) return
    if (sessionStatus === "loading") return

    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "souscription_do",
          produit: "dommage-ouvrage",
          email: payload.email,
          sourcePage: "souscription_do",
          sourcePath: "/souscription-dommage-ouvrage",
          needsSummary: [
            "Produit visé: dommage-ouvrage",
            payload.projectName ? `Projet: ${payload.projectName}` : null,
            payload.projectAddress ? `Adresse projet: ${payload.projectAddress}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
          recommendedProduct: "dommage-ouvrage",
          suitabilityScore: 94,
          context: {
            reason: "validation_souscription_do",
            projectName: payload.projectName,
            projectAddress: payload.projectAddress,
          },
        }),
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
    trackConversion("souscription_completed", {
      product: "do",
      source: "do-online",
      metadata: { primeAnnuelle: merged.premium, projectName: merged.projectName },
    })

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
      router.push("/espace-client?suite=do")
      return
    }

    router.push("/creer-compte")
  }

  if (resumeState === "missing") {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <h1 className="text-2xl font-semibold mb-3 text-black">Souscription introuvable</h1>
          <p className="text-[#171717] mb-6">
            Aucune demande dommage ouvrage exploitable n&apos;est associée à ce compte. Déposez la demande avec
            la même adresse email pour reprendre la souscription.
          </p>
          <Link
            href="/devis-dommage-ouvrage"
            className="inline-flex items-center rounded-xl bg-[#2563eb] px-5 py-3 font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Déposer une demande
          </Link>
        </div>
      </main>
    )
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
          Le règlement est un virement unique Mollie du montant indiqué. Après validation, la page de virement
          s&apos;ouvre. Si le dossier reste en étude, le même virement unique se fait depuis l&apos;espace client
          après acceptation.
        </p>

        <div className="bg-[#ebe0db] border border-[#d4c9c4] rounded-xl p-4 mb-8">
          <p className="font-medium text-black">Virement unique : {payload.premium.toLocaleString("fr-FR")} €</p>
          <p className="text-sm text-[#171717] mt-1">Chantier : {payload.projectName}</p>
          <p className="text-sm text-[#171717]">{payload.projectAddress}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] space-y-4">
            <p className="text-sm text-black">
              <strong>{payload.raisonSociale}</strong>
              {payload.siret ? <> — SIRET {payload.siret}</> : <> — particulier sans SIRET</>}
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
            disabled={insuranceLoading || !devoirConseilAccepte || sessionStatus === "loading"}
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
