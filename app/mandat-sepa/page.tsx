"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import type { SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS, FRAIS_GESTION_PRELEVEMENT } from "@/lib/types"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import type { PeriodicitePrelevement } from "@/lib/types"
import { getIbanValidationMessage, normalizeIban } from "@/lib/iban"

/** Unique mode : trimestriel — 1er trimestre + frais en CB, puis 3 prélèvements SEPA trimestriels. */
const PERIODICITE: PeriodicitePrelevement = "trimestriel"

function calculerPremierMontant(primeAnnuelle: number): number {
  const frais = FRAIS_GESTION_PRELEVEMENT
  const trimestriel = Math.round((primeAnnuelle / 4) * 100) / 100
  return trimestriel + frais
}

export default function MandatSepaPage() {
  const router = useRouter()
  const [data, setData] = useState<(SouscriptionData & { signature?: string }) | null>(null)
  const [iban, setIban] = useState("")
  const [titulaire, setTitulaire] = useState("")
  const [accepteSepa, setAccepteSepa] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.signature)
    const mandatStored = sessionStorage.getItem(STORAGE_KEYS.mandatSepa)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      const parsed = JSON.parse(stored) as SouscriptionData
      queueMicrotask(() => {
        setData(parsed)
        setTitulaire(parsed.representantLegal || parsed.raisonSociale)
        if (mandatStored) {
          const m = JSON.parse(mandatStored) as { iban?: string; titulaireCompte?: string }
          if (m.iban) setIban(m.iban)
          if (m.titulaireCompte) setTitulaire(m.titulaireCompte)
        }
      })
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.tarif) return

    const ibanClean = normalizeIban(iban)
    const ibanErr = getIbanValidationMessage(ibanClean)
    if (ibanErr) {
      setError(ibanErr)
      return
    }
    const titulaireTrim = titulaire.trim()
    if (!titulaireTrim) {
      setError("Le titulaire du compte est requis")
      return
    }
    if (!accepteSepa) {
      setError("Vous devez accepter le mandat SEPA")
      return
    }

    setError(null)
    const mandatData = {
      iban: ibanClean,
      titulaireCompte: titulaireTrim,
      accepteMandat: true,
      periodicite: PERIODICITE,
      primeAnnuelle: data.tarif.primeAnnuelle,
    }
    sessionStorage.setItem(STORAGE_KEYS.mandatSepa, JSON.stringify(mandatData))
    router.push("/paiement")
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  const premierMontant = calculerPremierMontant(data.tarif?.primeAnnuelle ?? 0)

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Breadcrumb items={[
          { label: "Accueil", href: "/" },
          { label: "Devis", href: "/devis" },
          { label: "Souscription", href: "/souscription" },
          { label: "Signature", href: "/signature" },
          { label: "IBAN & Mandat SEPA" },
        ]} />
        <Stepper currentStep="mandat-sepa" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          IBAN et mandat SEPA
        </h1>
        <p className="text-[#171717] mb-6">
          Renseignez l&apos;IBAN pour les <strong>prélèvements SEPA trimestriels</strong> (après le premier règlement par carte).
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-black mb-3">Récapitulatif</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#171717]">Société</dt>
              <dd className="font-medium text-black">{data.raisonSociale}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#171717]">Prime annuelle</dt>
              <dd className="font-medium text-black">{data.tarif?.primeAnnuelle?.toLocaleString("fr-FR")} €</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
            <h3 className="font-medium text-black mb-2">Paiement trimestriel</h3>
            <p className="text-sm text-[#171717] mb-3">
              <strong>4 échéances par an</strong> : le <strong>1er trimestre</strong> (avec {FRAIS_GESTION_PRELEVEMENT} € de frais de gestion) est réglé par <strong>carte bancaire</strong> à l&apos;étape suivante. Les <strong>3 trimestres suivants</strong> sont prélevés par <strong>SEPA</strong> sur l&apos;IBAN ci-dessous (montant par trimestre : 1/4 de la prime annuelle).
            </p>
            <p className="text-sm font-medium text-black">
              1er montant à régler par carte : {premierMontant.toLocaleString("fr-FR")} €
            </p>
          </div>

          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
            <h3 className="font-medium text-black mb-3">Mandat SEPA</h3>
            <div>
              <label className="block mb-2 text-sm font-medium text-black">IBAN *</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className={`w-full rounded-xl px-4 py-3 font-mono ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
            <div className="mt-4">
              <label className="block mb-2 text-sm font-medium text-black">Titulaire du compte *</label>
              <input
                type="text"
                value={titulaire}
                onChange={(e) => setTitulaire(e.target.value)}
                placeholder="Nom du titulaire ou raison sociale"
                className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
              />
            </div>
            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                id="sepa-mandat"
                checked={accepteSepa}
                onChange={(e) => setAccepteSepa(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-[#E5E0D8] text-[#2563eb] focus:ring-[#2563eb]"
              />
              <label htmlFor="sepa-mandat" className="text-sm text-black">
                En signant ce mandat, vous autorisez Optimum Assurance à envoyer des instructions à votre banque pour débiter votre compte et votre banque à débiter votre compte conformément aux instructions d&apos;Optimum Assurance. Vous bénéficiez du droit d&apos;être remboursé par votre banque selon les conditions de votre accord avec elle.
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium"
          >
            Continuer vers le paiement
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6">
          <Link href="/signature" className="text-[#2563eb] hover:underline">
            Retour à la signature
          </Link>
        </p>
      </div>
    </main>
  )
}
