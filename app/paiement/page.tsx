"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import type { SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS, FRAIS_GESTION_PRELEVEMENT } from "@/lib/types"
import type { PeriodicitePrelevement } from "@/lib/types"

function calculerEcheancier(primeAnnuelle: number, periodicite: PeriodicitePrelevement) {
  const frais = FRAIS_GESTION_PRELEVEMENT
  if (periodicite === "mensuel") {
    const mensualite = Math.round((primeAnnuelle / 12) * 100) / 100
    const premier = mensualite + frais
    return {
      nbEcheances: 12,
      libelle: "mensuel",
      echeances: [
        { numero: 1, montant: premier, date: "1er prélèvement", avecFrais: true },
        ...Array.from({ length: 11 }, (_, i) => ({
          numero: i + 2,
          montant: mensualite,
          date: `${i + 2}e prélèvement`,
          avecFrais: false,
        })),
      ],
      premierMontant: premier,
      montantEcheance: mensualite,
    }
  }
  const trimestriel = Math.round((primeAnnuelle / 4) * 100) / 100
  const premier = trimestriel + frais
  return {
    nbEcheances: 4,
    libelle: "trimestriel",
    echeances: [
      { numero: 1, montant: premier, date: "1er prélèvement", avecFrais: true },
      ...Array.from({ length: 3 }, (_, i) => ({
        numero: i + 2,
        montant: trimestriel,
        date: `${i + 2}e prélèvement`,
        avecFrais: false,
      })),
    ],
    premierMontant: premier,
    montantEcheance: trimestriel,
  }
}

export default function PaiementPage() {
  const router = useRouter()
  const [data, setData] = useState<(SouscriptionData & { signature?: string }) | null>(null)
  const [periodicite, setPeriodicite] = useState<PeriodicitePrelevement>("mensuel")
  const [iban, setIban] = useState("")
  const [titulaire, setTitulaire] = useState("")
  const [accepteSepa, setAccepteSepa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.signature)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      setData(JSON.parse(stored))
      const parsed = JSON.parse(stored) as SouscriptionData
      setTitulaire(parsed.representantLegal || parsed.raisonSociale)
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.tarif) return

    const ibanClean = iban.replace(/\s/g, "")
    if (!ibanClean || ibanClean.length < 15) {
      setError("IBAN invalide : saisissez un IBAN complet (ex. FR76 1234 5678 9012 3456 7890 123)")
      return
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(ibanClean)) {
      setError("Format IBAN incorrect : commence par 2 lettres (pays), 2 chiffres, puis caractères alphanumériques")
      return
    }
    if (!accepteSepa) {
      setError("Vous devez accepter le mandat SEPA")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const redirectUrl = `${baseUrl}/confirmation`
      const primeAnnuelle = data.tarif.primeAnnuelle ?? 0
      const amount = calculerEcheancier(primeAnnuelle, periodicite).premierMontant

      const payload: Record<string, unknown> = {
        amount,
        description: `Assurance décennale - ${data.raisonSociale}`,
        redirectUrl,
        metadata: {
          siret: data.siret,
          raisonSociale: data.raisonSociale,
          email: data.email,
          periodicite,
          primeAnnuelle,
          fraisGestion: FRAIS_GESTION_PRELEVEMENT,
        },
        customerEmail: data.email,
        method: "sepa",
        consumerName: titulaire,
        consumerAccount: ibanClean,
      }
      sessionStorage.setItem(
        STORAGE_KEYS.paiementOptions,
        JSON.stringify({ periodicite, primeAnnuelle })
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

  if (!data) {
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
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis", href: "/devis" }, { label: "Souscription", href: "/souscription" }, { label: "Signature", href: "/signature" }, { label: "Paiement" }]} />
        <Stepper currentStep="paiement" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Paiement
        </h1>
        <p className="text-[#171717] mb-6">
          Choisissez votre mode de paiement pour finaliser votre souscription.
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-black mb-3">Récapitulatif de votre souscription</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#171717]">Société</dt>
              <dd className="font-medium text-black">{data.raisonSociale}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#171717]">SIRET</dt>
              <dd className="font-mono text-black">{data.siret}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#171717]">Activités</dt>
              <dd className="text-black text-right">{data.activites?.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#171717]">Prime annuelle</dt>
              <dd className="font-medium text-black">{data.tarif?.primeAnnuelle?.toLocaleString("fr-FR")} €</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          {(() => {
            const ech = calculerEcheancier(data.tarif?.primeAnnuelle ?? 0, periodicite)
            return (
              <>
                <p className="text-2xl font-bold text-black">
                  {ech.premierMontant.toLocaleString("fr-FR")} €
                </p>
                <p className="text-sm text-[#171717]">
                  1er prélèvement (inclut {FRAIS_GESTION_PRELEVEMENT} € de frais de gestion)
                </p>
                <p className="text-sm text-[#171717] mt-1">
                  Puis {ech.nbEcheances - 1} prélèvement{ech.nbEcheances > 2 ? "s" : ""} de {ech.montantEcheance.toLocaleString("fr-FR")} € ({periodicite === "mensuel" ? "mensuels" : "trimestriels"})
                </p>
              </>
            )
          })()}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-[#171717]">
            Paiement par prélèvement SEPA automatique (Mollie)
          </p>

          <div className="space-y-6">
              <div className="p-4 bg-[#F9F6F0] rounded-xl border border-[#F0EBE3]">
                <h4 className="font-medium text-black mb-3">Période de prélèvement</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 p-4 border border-[#d4d4d4] rounded-xl cursor-pointer hover:bg-[#ebebeb] has-[:checked]:border-[#C65D3B] has-[:checked]:bg-[#F5E8E3] flex-1 bg-[#ebebeb]">
                    <input
                      type="radio"
                      name="periodicite"
                      value="mensuel"
                      checked={periodicite === "mensuel"}
                      onChange={() => setPeriodicite("mensuel")}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium block">Mensuel</span>
                      <span className="text-sm text-[#171717]">12 prélèvements</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-[#d4d4d4] rounded-xl cursor-pointer hover:bg-[#ebebeb] has-[:checked]:border-[#C65D3B] has-[:checked]:bg-[#F5E8E3] flex-1 bg-[#ebebeb]">
                    <input
                      type="radio"
                      name="periodicite"
                      value="trimestriel"
                      checked={periodicite === "trimestriel"}
                      onChange={() => setPeriodicite("trimestriel")}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium block">Trimestriel</span>
                      <span className="text-sm text-[#171717]">4 prélèvements</span>
                    </div>
                  </label>
                </div>
                <p className="text-sm text-[#171717] mt-3">
                  Frais de gestion de {FRAIS_GESTION_PRELEVEMENT} € appliqués sur le premier prélèvement.
                </p>
              </div>

              <div className="p-4 bg-[#F9F6F0] rounded-xl border border-[#F0EBE3] overflow-x-auto">
                <h4 className="font-medium text-black mb-3">Échéancier de paiement</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D8]">
                      <th className="text-left py-2 font-medium">Échéance</th>
                      <th className="text-right py-2 font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculerEcheancier(data.tarif?.primeAnnuelle ?? 0, periodicite).echeances.map((e) => (
                      <tr key={e.numero} className="border-b border-[#E5E0D8]/50">
                        <td className="py-2">{e.date}{e.avecFrais && " (dont frais de gestion)"}</td>
                        <td className="py-2 text-right font-medium">{e.montant.toLocaleString("fr-FR")} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-[#F9F6F0] rounded-xl border border-[#F0EBE3]">
                <h4 className="font-medium text-black mb-3">Mandat SEPA</h4>
                <div>
                <label className="block mb-2 text-sm font-medium text-black">
                  IBAN *
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none font-mono bg-[#ebebeb]"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-black">
                  Titulaire du compte *
                </label>
                <input
                  type="text"
                  value={titulaire}
                  onChange={(e) => setTitulaire(e.target.value)}
                  className="w-full border border-[#E5E0D8] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-white"
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="sepa-mandat"
                  checked={accepteSepa}
                  onChange={(e) => setAccepteSepa(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-[#E5E0D8] text-[#C65D3B] focus:ring-[#C65D3B]"
                />
                <label htmlFor="sepa-mandat" className="text-sm text-black">
                  En signant ce mandat, vous autorisez Optimum Assurance à envoyer
                  des instructions à votre banque pour débiter votre compte et
                  votre banque à débiter votre compte conformément aux
                  instructions d&apos;Optimum Assurance. Vous bénéficiez du droit
                  d&apos;être remboursé par votre banque selon les conditions de
                  votre accord avec elle.
                </label>
              </div>
              </div>
            </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C65D3B] text-white py-4 rounded-xl hover:bg-[#B04F2F] transition font-medium disabled:bg-[#D4C4BC] disabled:cursor-not-allowed"
          >
            {loading ? "Redirection vers le paiement..." : "Payer maintenant"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6">
          Paiement sécurisé par Mollie
        </p>
      </div>
    </main>
  )
}
