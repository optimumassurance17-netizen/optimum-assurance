"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { calculerTarif, type DevisResult } from "@/lib/tarification"
import type { DevisData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { ACTIVITES_BTP } from "@/lib/activites-btp"
import { CA_MINIMUM } from "@/lib/tarification"
import { faqDevis } from "@/lib/garanties-data"

function DevisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activites, setActivites] = useState<string[]>([])
  const [activiteSelectionnee, setActiviteSelectionnee] = useState("")
  const [siret, setSiret] = useState("")
  const [chiffreAffaires, setChiffreAffaires] = useState<string>("")
  const [sinistres, setSinistres] = useState<string>("0")
  const [montantIndemnisations, setMontantIndemnisations] = useState<string>("")
  const [releveSinistralite, setReleveSinistralite] = useState<File | null>(null)
  const [jamaisAssure, setJamaisAssure] = useState(false)
  const [resilieNonPaiement, setResilieNonPaiement] = useState(false)
  const [reprisePasse, setReprisePasse] = useState(false)
  const [tarif, setTarif] = useState<DevisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [siretLoading, setSiretLoading] = useState(false)
  const [siretPrefill, setSiretPrefill] = useState<{ raisonSociale?: string; adresse?: string; codePostal?: string; ville?: string; dateCreationSociete?: string } | null>(null)
  const [dateCreationSociete, setDateCreationSociete] = useState("")
  const [siretError, setSiretError] = useState<string | null>(null)
  const [emailDevis, setEmailDevis] = useState("")
  const [sendEmailLoading, setSendEmailLoading] = useState(false)
  const [sendEmailDone, setSendEmailDone] = useState(false)

  const nbSinistres = Number(sinistres) || 0
  const offreNettoyageToiture = activites.some(
    (a) => a.toLowerCase().includes("nettoyage toiture et peinture résine")
  )
  const besoinEtude = nbSinistres > 1 && !offreNettoyageToiture
  const aDesSinistres = nbSinistres >= 1

  const calculer = useCallback(() => {
    const ca = Number(chiffreAffaires) || 0
    const nbSinistresCount = Number(sinistres) || 0
    const offreNettoyage = activites.some(
      (a) => a.toLowerCase().includes("nettoyage toiture et peinture résine")
    )
    if (offreNettoyage) {
      const result = calculerTarif({
        chiffreAffaires: Math.max(ca, CA_MINIMUM),
        sinistres: nbSinistresCount,
        jamaisAssure,
        resilieNonPaiement,
        activites,
        reprisePasse,
      })
      setTarif(result)
      return
    }
    if (ca < CA_MINIMUM || nbSinistresCount > 1) {
      setTarif(null)
      return
    }
    const result = calculerTarif({
      chiffreAffaires: ca,
      sinistres: nbSinistresCount,
      jamaisAssure,
      resilieNonPaiement,
      activites,
      reprisePasse,
    })
    setTarif(result)
  }, [chiffreAffaires, sinistres, jamaisAssure, resilieNonPaiement, activites, reprisePasse])

  useEffect(() => {
    calculer()
  }, [calculer])

  useEffect(() => {
    if (searchParams.get("resume") === "1" && typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("optimum-devis-resume")
        if (saved) {
          const d = JSON.parse(saved) as Record<string, unknown>
          if (d.siret) setSiret(String(d.siret))
          if (d.chiffreAffaires != null) setChiffreAffaires(String(d.chiffreAffaires))
          if (d.sinistres != null) setSinistres(String(d.sinistres))
          if (d.jamaisAssure != null) setJamaisAssure(Boolean(d.jamaisAssure))
          if (d.resilieNonPaiement != null) setResilieNonPaiement(Boolean(d.resilieNonPaiement))
          if (d.reprisePasse != null) setReprisePasse(Boolean(d.reprisePasse))
          if (Array.isArray(d.activites)) setActivites(d.activites as string[])
          if (d.tarif) setTarif(d.tarif as DevisResult)
          if (d.raisonSociale || d.adresse) setSiretPrefill({
            raisonSociale: d.raisonSociale as string,
            adresse: d.adresse as string,
            codePostal: d.codePostal as string,
            ville: d.ville as string,
            dateCreationSociete: d.dateCreationSociete as string,
          })
          if (d.dateCreationSociete) setDateCreationSociete(String(d.dateCreationSociete))
          if (d.email) setEmailDevis(String(d.email))
          sessionStorage.removeItem("optimum-devis-resume")
          router.replace("/devis", { scroll: false })
        }
      } catch {
        /* ignore */
      }
    }
  }, [searchParams, router])

  const ajouterActivite = () => {
    if (activiteSelectionnee && activites.length < 8 && !activites.includes(activiteSelectionnee)) {
      setActivites([...activites, activiteSelectionnee])
      setActiviteSelectionnee("")
    }
  }

  const supprimerActivite = (index: number) => {
    setActivites(activites.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (besoinEtude) {
      const dataEtude = {
        siret,
        raisonSociale: siretPrefill?.raisonSociale,
        chiffreAffaires: Number(chiffreAffaires),
        sinistres: Number(sinistres),
        jamaisAssure,
        activites,
        montantIndemnisations: Number(montantIndemnisations) || 0,
        releveSinistraliteNom: releveSinistralite?.name,
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("optimum-etude", JSON.stringify(dataEtude))
      }
      router.push("/etude")
      return
    }
    if (!tarif || Number(chiffreAffaires) < CA_MINIMUM) return
    if (jamaisAssure && !dateCreationSociete.trim()) {
      alert("Veuillez renseigner la date de création de votre société (ou cliquez sur Remplir après avoir saisi votre SIRET).")
      return
    }
    setLoading(true)

    const data: DevisData & Record<string, unknown> = {
      siret,
      chiffreAffaires: Number(chiffreAffaires),
      sinistres: Number(sinistres),
      jamaisAssure,
      resilieNonPaiement,
      activites,
      tarif,
      reprisePasse: reprisePasse && nbSinistres === 0,
      montantIndemnisations: Number(montantIndemnisations) || 0,
      releveSinistraliteNom: releveSinistralite?.name,
    }
    if (siretPrefill) {
      Object.assign(data, siretPrefill)
    }
    if (jamaisAssure && dateCreationSociete.trim()) {
      data.dateCreationSociete = dateCreationSociete.trim()
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.devis, JSON.stringify(data))
    }
    router.push("/souscription")
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis décennale" }]} />
        <Stepper currentStep="devis" />
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#0a0a0a]">
          Demande de devis décennale
        </h1>
        <p className="text-[#171717] mb-10 text-lg">
          Renseignez vos informations pour obtenir une tarification automatique.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
            <label className="block mb-3 font-semibold text-[#0a0a0a]">
              Numéro SIRET
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))}
                placeholder="12345678900012"
                maxLength={14}
                className="flex-1 border border-[#d4d4d4] rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] font-mono text-[#0a0a0a] transition-all"
              />
              <button
                type="button"
                onClick={async () => {
                  if (siret.length !== 14) return
                  setSiretLoading(true)
                  setSiretPrefill(null)
                  setSiretError(null)
                  try {
                    const res = await fetch(`/api/siret?siret=${siret}`)
                    const data = await res.json()
                    if (res.ok && data.raisonSociale) {
                      setSiretPrefill({
                        raisonSociale: data.raisonSociale,
                        adresse: data.adresse,
                        codePostal: data.codePostal,
                        ville: data.ville,
                        dateCreationSociete: data.dateCreationSociete,
                      })
                      if (data.dateCreationSociete) {
                        setDateCreationSociete(data.dateCreationSociete)
                      }
                    } else {
                      setSiretError(data.error || "Entreprise introuvable. Vérifiez le SIRET ou réessayez.")
                    }
                  } catch {
                    setSiretError("Impossible de récupérer les données. Vérifiez le SIRET ou réessayez.")
                  } finally {
                    setSiretLoading(false)
                  }
                }}
                disabled={siret.length !== 14 || siretLoading}
                className="bg-[#C65D3B] text-white px-5 py-3.5 rounded-xl hover:bg-[#B04F2F] disabled:bg-[#d4d4d4] font-semibold shrink-0 transition-all"
              >
                {siretLoading ? "..." : "Remplir"}
              </button>
            </div>
            <p className="text-sm text-[#171717] mt-2">
              Saisissez votre SIRET puis cliquez sur Remplir pour pré-remplir vos coordonnées à l&apos;étape suivante.
            </p>
            {siretError && (
              <p className="mt-3 text-sm text-red-600 font-medium">
                {siretError}
              </p>
            )}
            {siretPrefill?.raisonSociale && (
              <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-800 mb-2">
                  ✓ Données pré-remplies depuis l&apos;API Sirene
                </p>
                <div className="space-y-1 text-sm text-emerald-700">
                  <p><strong>Raison sociale :</strong> {siretPrefill.raisonSociale}</p>
                  {siretPrefill.adresse && (
                    <p><strong>Adresse :</strong> {siretPrefill.adresse}</p>
                  )}
                  {(siretPrefill.codePostal || siretPrefill.ville) && (
                    <p>
                      <strong>Localisation :</strong>{" "}
                      {[siretPrefill.codePostal, siretPrefill.ville].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
            <label className="block mb-3 font-semibold text-[#0a0a0a]">
              Chiffre d&apos;affaires annuel (€)
            </label>
            <input
              type="number"
              value={chiffreAffaires}
              onChange={(e) => setChiffreAffaires(e.target.value)}
              min={CA_MINIMUM}
              step="1000"
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] text-[#0a0a0a] transition-all"
            />
            <p className="text-sm text-[#171717] mt-2">
              Minimum déclaratif : 40 000 €
            </p>
            {chiffreAffaires && Number(chiffreAffaires) > 0 && Number(chiffreAffaires) < CA_MINIMUM && (
              <p className="text-sm text-red-600 mt-1">
                Le chiffre d&apos;affaires minimum est de 40 000 €
              </p>
            )}
          </div>

          <div className="p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
            <label className="block mb-3 font-semibold text-[#0a0a0a]">
              Nombre de sinistres sur les 5 dernières années
            </label>
            <input
              type="number"
              value={sinistres}
              onChange={(e) => setSinistres(e.target.value)}
              min="0"
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] text-[#0a0a0a] transition-all"
            />
            {besoinEtude && (
              <p className="text-sm text-[#C65D3B] mt-1 font-medium">
                Plus d&apos;un sinistre : votre dossier sera transmis à notre équipe pour une étude personnalisée. Pas de tarification immédiate.
              </p>
            )}
          </div>

          {aDesSinistres && (
            <div className="space-y-5 p-6 bg-[#FEF3F0] rounded-2xl border border-[#C65D3B]/20">
              <h3 className="font-semibold text-[#0a0a0a]">
                Informations sinistres requises
              </h3>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#0a0a0a]">
                  Montant total des indemnisations (€) *
                </label>
                <input
                  type="number"
                  value={montantIndemnisations}
                  onChange={(e) => setMontantIndemnisations(e.target.value)}
                  min="0"
                  step="1"
                  placeholder="Ex: 15000"
                  className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] text-[#0a0a0a]"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#0a0a0a]">
                  Relevé de sinistralité *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setReleveSinistralite(e.target.files?.[0] ?? null)}
                  className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#C65D3B] file:text-white file:font-medium"
                />
                <p className="text-xs text-[#171717] mt-1">
                  Document fourni par votre ancien assureur. Format PDF. Vous pourrez le transmettre à notre conseiller lors du contact.
                </p>
                {releveSinistralite && (
                  <p className="text-sm text-[#C65D3B] mt-1 font-medium">
                    ✓ {releveSinistralite.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="jamais"
                checked={jamaisAssure}
                onChange={(e) => setJamaisAssure(e.target.checked)}
                className="w-5 h-5 rounded border-[#d4d4d4] text-[#C65D3B] focus:ring-[#C65D3B]"
              />
              <label htmlFor="jamais" className="text-[#0a0a0a] font-medium">
                Je n&apos;ai jamais été assuré
              </label>
            </div>
            {jamaisAssure && (
              <div className="ml-8 mt-2">
                <label htmlFor="dateCreationSociete" className="block text-sm font-medium text-[#0a0a0a] mb-1">
                  Date de création de votre société
                </label>
                <input
                  type="date"
                  id="dateCreationSociete"
                  value={dateCreationSociete}
                  onChange={(e) => setDateCreationSociete(e.target.value)}
                  className="border border-[#d4d4d4] rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-white text-[#0a0a0a]"
                />
                <p className="text-xs text-[#171717] mt-1">
                  Une attestation de non sinistralité sera générée automatiquement de cette date au jour de prise d&apos;effet.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="resilie"
                checked={resilieNonPaiement}
                onChange={(e) => setResilieNonPaiement(e.target.checked)}
                className="w-5 h-5 rounded border-[#d4d4d4] text-[#C65D3B] focus:ring-[#C65D3B]"
              />
              <label htmlFor="resilie" className="text-[#0a0a0a] font-medium">
                Ma société a été résiliée pour non-paiement
              </label>
            </div>
            <p className="text-sm text-[#171717] leading-relaxed">
              Nous acceptons les sociétés résiliées pour non-paiement pour toutes les activités. Une majoration de 10 % s&apos;applique en cas de résiliation pour non-paiement. Nous acceptons également les sociétés de nettoyage toiture.
            </p>
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="reprisePasse"
                checked={reprisePasse}
                onChange={(e) => setReprisePasse(e.target.checked)}
                disabled={nbSinistres > 0}
                className="w-5 h-5 rounded border-[#d4d4d4] text-[#C65D3B] focus:ring-[#C65D3B] mt-0.5"
              />
              <div>
                <label htmlFor="reprisePasse" className="text-[#0a0a0a] font-medium cursor-pointer">
                  Reprise du passé (jusqu&apos;à 3 mois en arrière)
                </label>
                <p className="text-sm text-[#171717] mt-1">
                  Couverture rétroactive de vos ouvrages des 3 derniers mois, sous réserve de non sinistralité. Majoration de 40 % sur ces 3 mois.
                </p>
                {reprisePasse && nbSinistres === 0 && (
                  <p className="text-sm text-[#C65D3B] mt-1 font-medium">
                    Une attestation de non sinistralité sera générée automatiquement sur la période reprise (3 mois).
                  </p>
                )}
                {nbSinistres > 0 && (
                  <p className="text-sm text-[#C65D3B] mt-1 font-medium">
                    Non disponible en cas de sinistre déclaré
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm">
            <label className="block mb-4 font-semibold text-[#0a0a0a]">
              Activités à assurer (max 8)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select
                value={activiteSelectionnee}
                onChange={(e) => setActiviteSelectionnee(e.target.value)}
                className="flex-1 border border-[#d4d4d4] rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb] text-[#0a0a0a] transition-all"
              >
                <option value="">Sélectionnez une activité</option>
                {ACTIVITES_BTP.map((act) => (
                  <option key={act} value={act} disabled={activites.includes(act)}>
                    {act}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={ajouterActivite}
                disabled={!activiteSelectionnee || activites.length >= 8}
                className="bg-[#C65D3B] text-white px-6 py-3.5 rounded-xl hover:bg-[#B04F2F] disabled:bg-[#d4d4d4] font-semibold transition-all min-h-[44px] shrink-0"
              >
                Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {activites.map((act, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-[#ebebeb] border border-[#d4d4d4] rounded-xl px-4 py-3"
                >
                  <span className="text-[#0a0a0a] font-medium">{act}</span>
                  <button
                    type="button"
                    onClick={() => supprimerActivite(index)}
                    className="text-[#C65D3B] text-sm hover:underline py-2 px-3 -my-1 min-h-[44px] flex items-center"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>

          {besoinEtude && chiffreAffaires && Number(chiffreAffaires) >= CA_MINIMUM && (
            <div className="bg-[#FEF3F0] border border-[#C65D3B]/30 rounded-2xl p-6">
              <h3 className="font-semibold text-black mb-2">
                Étude personnalisée requise
              </h3>
              <p className="text-[#171717] text-sm">
                Avec plus d&apos;un sinistre déclaré, votre dossier nécessite une étude par notre équipe. Un conseiller vous contactera sous 48h avec une proposition sur mesure.
              </p>
            </div>
          )}

          {!besoinEtude && tarif && chiffreAffaires && Number(chiffreAffaires) >= CA_MINIMUM && (
            <div className="bg-[#FEF3F0] border-2 border-[#C65D3B]/30 rounded-2xl p-6 shadow-lg shadow-[#C65D3B]/10">
              <h3 className="font-semibold text-black mb-4">
                Votre tarification
              </h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-[#C65D3B] tracking-tight">
                  {tarif.primeMensuelle} €
                </span>
                <span className="text-[#171717]">/ mois</span>
              </div>
              <p className="text-sm text-[#171717] mb-4">
                Soit {tarif.primeAnnuelle} € par an
              </p>
              {tarif.reprisePasse && tarif.supplementReprisePasse && (
                <p className="text-sm text-[#C65D3B] mb-2 font-medium">
                  Dont reprise du passé (3 mois à +40 %) : +{tarif.supplementReprisePasse.toLocaleString("fr-FR")} €
                </p>
              )}
              <div className="text-sm text-[#171717] space-y-1">
                <p>Franchise : {tarif.franchise.toLocaleString("fr-FR")} €</p>
                <p>Plafond : {tarif.plafond.toLocaleString("fr-FR")} €</p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#C65D3B]/20">
                <p className="text-sm font-medium text-[#0a0a0a] mb-2">Sauvegarder et recevoir un lien pour reprendre ce devis (valable 7 jours)</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailDevis}
                    onChange={(e) => setEmailDevis(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 border border-[#d4d4d4] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!emailDevis) return
                      setSendEmailLoading(true)
                      setSendEmailDone(false)
                      try {
                        const devisData = {
                          siret,
                          chiffreAffaires: Number(chiffreAffaires),
                          sinistres: Number(sinistres),
                          jamaisAssure,
                          resilieNonPaiement,
                          reprisePasse,
                          activites,
                          tarif,
                          montantIndemnisations: Number(montantIndemnisations) || 0,
                          ...(siretPrefill || {}),
                        }
                        const res = await fetch("/api/devis/send-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: emailDevis,
                            devis: devisData,
                          }),
                        })
                        if (res.ok) setSendEmailDone(true)
                      } finally {
                        setSendEmailLoading(false)
                      }
                    }}
                    disabled={!emailDevis || sendEmailLoading}
                    className="bg-[#C65D3B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:bg-[#d4d4d4] transition-all"
                  >
                    {sendEmailLoading ? "Envoi..." : sendEmailDone ? "Envoyé ✓" : "Sauvegarder et recevoir le lien"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              Number(chiffreAffaires) < CA_MINIMUM ||
              (!besoinEtude && !tarif) ||
              (aDesSinistres && (!montantIndemnisations || !releveSinistralite))
            }
            className="w-full bg-[#C65D3B] text-white py-4 rounded-2xl hover:bg-[#B04F2F] transition-all font-semibold disabled:bg-[#d4d4d4] disabled:cursor-not-allowed shadow-lg shadow-[#C65D3B]/20"
          >
            {loading
              ? "Redirection..."
              : besoinEtude
                ? "Demander une étude"
                : "Continuer vers la souscription"}
          </button>
        </form>

        {/* Mini-FAQ */}
        <section className="mt-16 pt-8 border-t border-[#e5e5e5]">
          <h2 className="text-xl font-bold text-[#0a0a0a] mb-6">Questions fréquentes</h2>
          <div className="space-y-4">
            {faqDevis.map((faq, i) => (
              <details key={i} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden group">
                <summary className="px-5 py-4 font-medium text-[#0a0a0a] cursor-pointer list-none flex justify-between items-center hover:bg-[#FEF3F0]/50 transition-colors [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-[#C65D3B] text-lg group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-5 pb-4 text-[#171717] text-sm leading-relaxed">
                  {faq.r}
                </div>
              </details>
            ))}
          </div>
          <p className="text-center mt-6">
            <Link href="/faq" className="text-[#C65D3B] font-medium hover:underline">Voir toutes les questions →</Link>
          </p>
        </section>

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/" className="text-[#C65D3B] font-medium hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function DevisPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-pulse text-[#171717]">Chargement...</div>
      </main>
    }>
      <DevisPageContent />
    </Suspense>
  )
}
