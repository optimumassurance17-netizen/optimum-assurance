"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DevoirConseil } from "@/components/DevoirConseil"
import type { DevisData, SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { AdresseAutocomplete } from "@/components/AdresseAutocomplete"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import { runInsuranceContractStepAfterSouscription } from "@/lib/souscription-insurance-contract"

export default function SouscriptionPage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [devis, setDevis] = useState<DevisData | null>(null)
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [siretLoading, setSiretLoading] = useState(false)
  const [siretError, setSiretError] = useState<string | null>(null)
  const [insuranceLoading, setInsuranceLoading] = useState(false)
  const [form, setForm] = useState<Partial<SouscriptionData>>({
    raisonSociale: "",
    adresse: "",
    codePostal: "",
    ville: "",
    email: "",
    telephone: "",
    representantLegal: "",
    civilite: "M",
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.devis)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      const data = JSON.parse(stored) as DevisData & { raisonSociale?: string; adresse?: string; codePostal?: string; ville?: string }
      setDevis(data)
      setForm((f) => ({ ...f, ...data }))
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const remplirDepuisSirene = async () => {
    const s = (form.siret || devis?.siret || "").replace(/\D/g, "").slice(0, 14)
    if (s.length !== 14) return
    setSiretLoading(true)
    setSiretError(null)
    try {
      const res = await fetch(`/api/siret?siret=${s}`)
      const data = await res.json()
      if (res.ok && data.raisonSociale) {
        setForm((f) => ({
          ...f,
          siret: s,
          raisonSociale: data.raisonSociale,
          adresse: data.adresse ?? f.adresse,
          codePostal: data.codePostal ?? f.codePostal,
          ville: data.ville ?? f.ville,
        }))
      } else {
        setSiretError(data.error || "Entreprise introuvable. Vérifiez le SIRET ou réessayez.")
      }
    } catch {
      setSiretError("Impossible de récupérer les données. Vérifiez le SIRET ou réessayez.")
    } finally {
      setSiretLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = form.email?.trim()
    const raisonSociale = form.raisonSociale?.trim()
    const representantLegal = form.representantLegal?.trim()
    if (!devis || !email || !raisonSociale || !representantLegal || !devoirConseilAccepte) return

    // Traçabilité devoir de conseil
    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "souscription", produit: "decennale", email }),
      })
    } catch {
      /* non bloquant */
    }

    const souscription: SouscriptionData = {
      ...devis,
      siret: (form.siret ?? devis.siret) || "",
      raisonSociale: raisonSociale!,
      adresse: (form.adresse || "").trim(),
      codePostal: (form.codePostal || "").trim(),
      ville: (form.ville || "").trim(),
      email: email!,
      telephone: (form.telephone || "").trim(),
      representantLegal: representantLegal!,
      civilite: (form.civilite as "M" | "Mme" | "Mlle") || "M",
    }
    sessionStorage.setItem(STORAGE_KEYS.souscription, JSON.stringify(souscription))

    if (sessionStatus === "authenticated") {
      setInsuranceLoading(true)
      try {
        const ins = await runInsuranceContractStepAfterSouscription(souscription)
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

  if (!devis) {
    return (
      <main className="min-h-screen bg-slate-50/80 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50/80">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis", href: "/devis" }, { label: "Souscription" }]} />
        <Stepper currentStep="souscription" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Souscription
        </h1>
        <p className="text-[#171717] mb-8">
          Complétez vos coordonnées pour finaliser votre assurance décennale.
        </p>

        <div className="bg-[#ebe0db] border border-[#d4c9c4] rounded-xl p-4 mb-8">
          <p className="font-medium text-black">
            Tarif :{" "}
            {devis.tarif?.primeMensuelle != null
              ? `${devis.tarif.primeMensuelle.toLocaleString("fr-FR")} € / mois (équivalent)`
              : devis.tarif?.primeAnnuelle != null
                ? `${Math.round((devis.tarif.primeAnnuelle / 12) * 100) / 100} € / mois (équivalent)`
                : "—"}
          </p>
          <p className="text-sm text-[#171717]">
            Soit {devis.tarif?.primeAnnuelle?.toLocaleString("fr-FR")} €/an — prélevé par trimestre :{" "}
            {devis.tarif?.primeTrimestrielle ?? (devis.tarif?.primeAnnuelle ? Math.round((devis.tarif.primeAnnuelle / 4) * 100) / 100 : "—")}{" "}
            € / trimestre
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <label className="block mb-2 font-medium text-black">
              SIRET — Remplir depuis l&apos;API Sirene
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={form.siret ?? devis.siret ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value.replace(/\D/g, "").slice(0, 14) }))}
                placeholder="12345678900012"
                maxLength={14}
                className={`flex-1 rounded-xl px-4 py-3 font-mono ${inputFieldBg} ${inputTextDark}`}
              />
              <button
                type="button"
                onClick={remplirDepuisSirene}
                disabled={((form.siret ?? devis.siret) || "").replace(/\D/g, "").length !== 14 || siretLoading}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-[#1d4ed8] disabled:bg-slate-300 font-semibold shrink-0 transition-all"
              >
                {siretLoading ? "..." : "Remplir"}
              </button>
            </div>
            <p className="text-sm text-[#0a0a0a] mt-2">
              Cliquez sur Remplir pour pré-remplir raison sociale, adresse et ville.
            </p>
            {siretError && (
              <p className="mt-2 text-sm text-red-600 font-medium">{siretError}</p>
            )}
            <AdresseAutocomplete
              show={!!siretError}
              onPick={(a) => {
                setForm((f) => ({
                  ...f,
                  adresse: a.adresse,
                  codePostal: a.codePostal,
                  ville: a.ville,
                }))
                setSiretError(null)
              }}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Raison sociale *
            </label>
            <input
              type="text"
              name="raisonSociale"
              value={form.raisonSociale}
              onChange={handleChange}
              required
              className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Adresse
            </label>
            <input
              type="text"
              name="adresse"
              value={form.adresse}
              onChange={handleChange}
              className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-medium text-black">
                Code postal
              </label>
              <input
                type="text"
                name="codePostal"
                value={form.codePostal}
                onChange={handleChange}
                maxLength={5}
                className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-black">
                Ville
              </label>
              <input
                type="text"
                name="ville"
                value={form.ville}
                onChange={handleChange}
                className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
            />
          </div>

          <DevoirConseil
            produit="decennale"
            checkboxId="devoir-conseil-souscription"
            checked={devoirConseilAccepte}
            onCheckedChange={setDevoirConseilAccepte}
            labelCheckbox="J'ai pris connaissance des garanties et exclusions et confirme que ce contrat correspond à ma situation."
          />

          <div>
            <p className="block mb-2 font-medium text-black">
              Représentant légal
            </p>
            <div className="flex gap-3">
              <div className="flex flex-col">
                <label htmlFor="civilite" className="sr-only">Civilité</label>
                <select
                  id="civilite"
                  name="civilite"
                  value={form.civilite}
                  onChange={handleChange}
                  className={`rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
                  aria-label="Civilité"
                >
                  <option value="M">M.</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col">
                <label htmlFor="representantLegal" className="sr-only">Nom complet du représentant légal</label>
                <input
                  id="representantLegal"
                  type="text"
                  name="representantLegal"
                  value={form.representantLegal}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  required
                  className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!devoirConseilAccepte || insuranceLoading || sessionStatus === "loading"}
            className="w-full rounded-xl bg-blue-600 py-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            {sessionStatus === "loading"
              ? "Vérification de la session…"
              : insuranceLoading
                ? "Création du contrat…"
                : sessionStatus === "authenticated"
                  ? "Continuer (compte connecté)"
                  : "Continuer vers la signature"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6 space-x-4">
          <Link href="/devis" className="text-blue-600 hover:underline">
            Modifier mon devis
          </Link>
          <span>·</span>
          <Link href="/faq#souscription" className="text-blue-600 hover:underline">
            FAQ parcours souscription
          </Link>
        </p>
      </div>
    </main>
  )
}
