"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { calculerTarif, type DevisResult } from "@/lib/tarification"
import type { DevisData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { ACTIVITES_BTP } from "@/lib/activites-btp"
import { CA_MINIMUM } from "@/lib/tarification"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import { getMetierPrefillActivites } from "@/lib/metier-devis-prefill"
import { readResponseJson } from "@/lib/read-response-json"

const AdresseAutocomplete = dynamic(
  () => import("@/components/AdresseAutocomplete").then((m) => m.AdresseAutocomplete),
  { ssr: false },
)

const DevisFaq = dynamic(
  () => import("@/components/devis/DevisFaq").then((m) => m.DevisFaq),
  { ssr: false },
)

function DevisPageContent() {
  const router = useRouter()
  const [metierParam, setMetierParam] = useState<string | null>(null)
  const [resumeParam, setResumeParam] = useState<string | null>(null)
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

  useEffect(() => {
    if (typeof window === "undefined") return
    const urlParams = new URLSearchParams(window.location.search)
    setMetierParam(urlParams.get("metier"))
    setResumeParam(urlParams.get("resume"))
  }, [])

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

  /** Préremplissage activité(s) depuis /assurance-decennale/[metier] (?metier=slug) */
  useEffect(() => {
    const slug = metierParam
    if (!slug || typeof window === "undefined") return
    const prefill = getMetierPrefillActivites(slug)
    if (prefill.length === 0) return
    setActivites((prev) => {
      if (prev.length > 0) return prev
      const merged = prefill.filter((a) => ACTIVITES_BTP.includes(a as (typeof ACTIVITES_BTP)[number]))
      return merged.slice(0, 8)
    })
  }, [metierParam])

  useEffect(() => {
    if (resumeParam === "1" && typeof window !== "undefined") {
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
  }, [resumeParam, router])

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
    <main className="min-h-screen bg-slate-50/80">
      <Header />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis décennale" }]} />
        <Stepper currentStep="devis" />
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
          Demande de devis décennale
        </h1>
        <p className="text-[#171717] mb-10 text-lg">
          Renseignez vos informations pour obtenir une tarification automatique.
        </p>
        <p className="text-sm text-slate-700 -mt-6 mb-8">
          Vous cherchez une version express ?{" "}
          <Link href="/devis-assurance-decennale-en-ligne" className="text-blue-600 font-semibold hover:underline">
            Accéder à la page devis assurance décennale en ligne
          </Link>
          .
        </p>
        <section className="mb-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Réponse rapide</p>
              <p className="text-xs text-emerald-800 mt-1">Tarification immédiate pour les dossiers éligibles.</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Parcours 100 % en ligne</p>
              <p className="text-xs text-blue-800 mt-1">SIRET, souscription, signature électronique et paiement sécurisé.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Sans engagement</p>
              <p className="text-xs text-slate-700 mt-1">Vous visualisez votre tarif avant toute validation contractuelle.</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-900 font-semibold mb-2">Cas fréquents traités</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Jamais assuré</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Résilié non-paiement</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Sinistres récents</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Reprise du passé</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <label className="block mb-3 font-semibold text-slate-900">
              Numéro SIRET
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))}
                placeholder="12345678900012"
                maxLength={14}
                className={`flex-1 rounded-xl px-4 py-3.5 font-mono transition-all ${inputFieldBg} ${inputTextDark}`}
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
                    const data = await readResponseJson<{
                      error?: string
                      raisonSociale?: string
                      adresse?: string
                      codePostal?: string
                      ville?: string
                      dateCreationSociete?: string
                    }>(res)
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
                className="bg-blue-600 text-white px-5 py-3.5 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 font-semibold shrink-0 transition-all"
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
            <AdresseAutocomplete
              show={!!siretError}
              onPick={(a) => {
                setSiretPrefill((prev) => ({
                  raisonSociale: prev?.raisonSociale,
                  dateCreationSociete: prev?.dateCreationSociete,
                  adresse: a.adresse,
                  codePostal: a.codePostal,
                  ville: a.ville,
                }))
                setSiretError(null)
              }}
            />
            {siretPrefill?.raisonSociale && (
              <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  ✓ Données pré-remplies depuis l&apos;API Sirene
                </p>
                <div className="space-y-1 text-sm text-black">
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

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <label className="block mb-3 font-semibold text-slate-900">
              Chiffre d&apos;affaires annuel (€)
            </label>
            <input
              type="number"
              value={chiffreAffaires}
              onChange={(e) => setChiffreAffaires(e.target.value)}
              min={CA_MINIMUM}
              step="1000"
              className={`w-full rounded-xl px-4 py-3.5 transition-all ${inputFieldBg} ${inputTextDark}`}
            />
            <p className="text-sm text-slate-900 mt-2">
              Minimum déclaratif : 40 000 €
            </p>
            <p className="text-sm text-slate-900 mt-1.5 italic">
              Les déclarations de CA sont contrôlées chaque année auprès du greffe et des impôts. Pour éviter les régularisations, pensez à bien indiquer votre CA réel.
            </p>
            {chiffreAffaires && Number(chiffreAffaires) > 0 && Number(chiffreAffaires) < CA_MINIMUM && (
              <p className="text-sm text-red-600 mt-1">
                Le chiffre d&apos;affaires minimum est de 40 000 €
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <label className="block mb-3 font-semibold text-slate-900">
              Nombre de sinistres sur les 5 dernières années
            </label>
            <input
              type="number"
              value={sinistres}
              onChange={(e) => setSinistres(e.target.value)}
              min="0"
              className={`w-full rounded-xl px-4 py-3.5 transition-all ${inputFieldBg} ${inputTextDark}`}
            />
            {besoinEtude && (
              <p className="text-sm text-blue-600 mt-1 font-medium">
                Plus d&apos;un sinistre : votre dossier sera transmis à notre équipe pour une étude personnalisée. Pas de tarification immédiate.
              </p>
            )}
          </div>

          {aDesSinistres && (
            <div className="space-y-5 p-6 bg-blue-50 rounded-2xl border border-blue-600/20">
              <h3 className="font-semibold text-slate-900">
                Informations sinistres requises
              </h3>
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-900">
                  Montant total des indemnisations (€) *
                </label>
                <input
                  type="number"
                  value={montantIndemnisations}
                  onChange={(e) => setMontantIndemnisations(e.target.value)}
                  min="0"
                  step="1"
                  placeholder="Ex: 15000"
                  className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark}`}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-900">
                  Relevé de sinistralité *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setReleveSinistralite(e.target.files?.[0] ?? null)}
                  className={`w-full rounded-xl px-4 py-3 ${inputFieldBg} ${inputTextDark} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-medium`}
                />
                <p className="text-xs text-[#171717] mt-1">
                  Document fourni par votre ancien assureur. Format PDF. Vous pourrez le transmettre à notre conseiller lors du contact.
                </p>
                {releveSinistralite && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    ✓ {releveSinistralite.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="jamais"
                checked={jamaisAssure}
                onChange={(e) => setJamaisAssure(e.target.checked)}
                className="w-5 h-5 rounded border-[#d4d4d4] text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="jamais" className="text-slate-900 font-medium">
                Je n&apos;ai jamais été assuré
              </label>
            </div>
            {jamaisAssure && (
              <div className="ml-8 mt-2">
                <label htmlFor="dateCreationSociete" className="block text-sm font-medium text-slate-900 mb-1">
                  Date de création de votre société
                </label>
                <input
                  type="date"
                  id="dateCreationSociete"
                  value={dateCreationSociete}
                  onChange={(e) => setDateCreationSociete(e.target.value)}
                  className={`rounded-xl px-4 py-2.5 ${inputFieldBg} ${inputTextDark}`}
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
                className="w-5 h-5 rounded border-[#d4d4d4] text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="resilie" className="text-slate-900 font-medium">
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
                className="w-5 h-5 rounded border-[#d4d4d4] text-blue-600 focus:ring-blue-600 mt-0.5"
              />
              <div>
                <label htmlFor="reprisePasse" className="text-slate-900 font-medium cursor-pointer">
                  Reprise du passé (jusqu&apos;à 3 mois en arrière)
                </label>
                <p className="text-sm text-[#171717] mt-1">
                  Couverture rétroactive de vos ouvrages des 3 derniers mois, sous réserve de non sinistralité. Majoration de 40 % sur ces 3 mois.
                </p>
                {reprisePasse && nbSinistres === 0 && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    Une attestation de non sinistralité sera générée automatiquement sur la période reprise (3 mois).
                  </p>
                )}
                {nbSinistres > 0 && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    Non disponible en cas de sinistre déclaré
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <label htmlFor="activite-selection" className="block mb-4 font-semibold text-slate-900">
              Activités à assurer (max 8)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select
                id="activite-selection"
                value={activiteSelectionnee}
                onChange={(e) => setActiviteSelectionnee(e.target.value)}
                className={`flex-1 rounded-xl px-4 py-3.5 transition-all ${inputFieldBg} ${inputTextDark}`}
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
                className="bg-blue-600 text-white px-6 py-3.5 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 font-semibold transition-all min-h-[44px] shrink-0"
              >
                Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {activites.map((act, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-[#e4e4e4] border border-[#d4d4d4] rounded-xl px-4 py-3"
                >
                  <span className="text-black font-medium">{act}</span>
                  <button
                    type="button"
                    onClick={() => supprimerActivite(index)}
                    className="text-blue-600 text-sm hover:underline py-2 px-3 -my-1 min-h-[44px] flex items-center"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 rounded-xl border border-blue-600/30 bg-blue-50">
              <p className="text-sm font-semibold text-slate-900 mb-1">Vous ne trouvez pas votre activité dans la liste ?</p>
              <p className="text-sm text-[#171717] mb-3">
                Décrivez votre domaine : notre équipe étudie les cas spécifiques et vous recontacte sous 24 h.
              </p>
              <Link
                href="/etude/domaine"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
              >
                Faire une demande d&apos;étude pour une activité non listée
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {besoinEtude && chiffreAffaires && Number(chiffreAffaires) >= CA_MINIMUM && (
            <div className="bg-blue-50 border border-blue-600/30 rounded-2xl p-6">
              <h3 className="font-semibold text-black mb-2">
                Étude personnalisée requise
              </h3>
              <p className="text-[#171717] text-sm">
                Avec plus d&apos;un sinistre déclaré, votre dossier nécessite une étude par notre équipe. Un conseiller vous contactera sous 24 h avec une proposition sur mesure.
              </p>
            </div>
          )}

          {!besoinEtude && tarif && chiffreAffaires && Number(chiffreAffaires) >= CA_MINIMUM && (
            <div className="bg-blue-50 border-2 border-blue-600/30 rounded-2xl p-6 shadow-lg shadow-blue-600/10">
              <h3 className="font-semibold text-black mb-4">
                Votre tarification
              </h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-blue-600 tracking-tight">
                  {tarif.primeMensuelle.toLocaleString("fr-FR")} €
                </span>
                <span className="text-[#171717]">/ mois (équivalent)</span>
              </div>
              <p className="text-sm text-[#171717] mb-2">
                Soit {tarif.primeAnnuelle.toLocaleString("fr-FR")} €/an — prélevé par trimestre :{" "}
                <strong>{tarif.primeTrimestrielle.toLocaleString("fr-FR")} €</strong> / trimestre (hors 1er paiement CB + frais)
              </p>
              {tarif.reprisePasse && tarif.supplementReprisePasse && (
                <p className="text-sm text-blue-600 mb-2 font-medium">
                  Dont reprise du passé (3 mois à +40 %) : +{tarif.supplementReprisePasse.toLocaleString("fr-FR")} €
                </p>
              )}
              <div className="text-sm text-[#171717] space-y-1">
                <p>Franchise : {tarif.franchise.toLocaleString("fr-FR")} €</p>
                <p>Plafond : {tarif.plafond.toLocaleString("fr-FR")} €</p>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-600/20">
                <label htmlFor="email-devis-save" className="block text-sm font-medium text-slate-900 mb-2">Sauvegarder et recevoir un lien pour reprendre ce devis (valable 7 jours)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="email-devis-save"
                    type="email"
                    value={emailDevis}
                    onChange={(e) => setEmailDevis(e.target.value)}
                    placeholder="votre@email.com"
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm ${inputFieldBg} ${inputTextDark}`}
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
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:bg-slate-300 transition-all"
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
            className="w-full bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 transition-all font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading
              ? "Redirection..."
              : besoinEtude
                ? "Demander une étude"
                : "Continuer vers la souscription"}
          </button>
        </form>
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Avant de finaliser : guides utiles</h2>
          <p className="text-sm text-slate-700 mb-4">
            Ces pages répondent aux questions les plus fréquentes avant signature (obligations, résiliation, sinistre).
          </p>
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <Link href="/guides/obligation-decennale" className="text-blue-600 hover:underline">
              Obligation décennale
            </Link>
            <Link href="/guides/resiliation-decennale" className="text-blue-600 hover:underline">
              Résilier sa décennale
            </Link>
            <Link href="/guides/declaration-sinistre" className="text-blue-600 hover:underline">
              Déclarer un sinistre
            </Link>
          </div>
        </section>

        <DevisFaq />

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function DevisPage() {
  return <DevisPageContent />
}
