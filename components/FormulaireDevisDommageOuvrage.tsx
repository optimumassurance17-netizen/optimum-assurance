"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  QUALITES_MAITRE_OUVRAGE,
  TYPES_OUVRAGE,
  GARANTIES_LABELS,
  TYPES_CONTRAT,
  type DevisDommageOuvrageData,
  type QualiteMaitreOuvrage,
  type TypeOuvrage,
  type GarantieSouhaitee,
  type TypeContrat,
} from "@/lib/dommage-ouvrage-types"
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"
import { DevoirConseil } from "@/components/DevoirConseil"
import { AdresseAutocomplete } from "@/components/AdresseAutocomplete"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"

const STEPS = [
  { id: 1, label: "Souscripteur" },
  { id: 2, label: "Opération" },
  { id: 3, label: "Ouvrage & coûts" },
  { id: 4, label: "Terrain & technique" },
  { id: 5, label: "Garanties & réalisateurs" },
]

const inputClass = `w-full rounded-xl px-4 py-3.5 font-semibold ${inputFieldBg} ${inputTextDark}`
const labelClass = "block mb-2 font-semibold text-black"
const sectionClass = "p-6 bg-[#f5f5f5] rounded-2xl border border-[#d4d4d4] shadow-sm"

const initialData: Partial<DevisDommageOuvrageData> = {
  qualiteMaitreOuvrage: "particulier_habitation",
  maitreOuvrageEstSouscripteur: true,
  typeOuvrage: "maison_individuelle",
  destinationConstruction: "location",
  operationClosCouvert: false,
  habitationPrincipaleSecondaire: true,
  nbBatiments: 1,
  nbEtages: 0,
  nbSousSols: 0,
  garages: false,
  caves: false,
  piscines: false,
  photovoltaiques: false,
  coutTvaIncluse: true,
  etudeBetonArme: false,
  techniqueCourante: true,
  produitsAvisTechnique: false,
  vitragesAgrafesColles: false,
  distanceMerMoins300m: false,
  solRemblaiRecent: false,
  solRemblaisInstables: false,
  solArgileGonflante: false,
  solTourbeVaseArgile: false,
  solGaleriesMinesDecharges: false,
  altitudeSup1000m: false,
  merMoins500m: false,
  terrainEnPente: false,
  maitriseOeuvreMissionComplete: true,
  controleTechnique: true,
  etudeSol: true,
  typeContrat: "contractant_general",
  garanties: ["do"],
  dommagesBiensEquipement: false,
  dommagesExistants: false,
  reprisePasse: false,
  travauxNeufsAvecExistants: false,
}

const STORAGE_KEY = "optimum-devis-do-brouillon"

const QUALITES_PROFESSIONNELLES: QualiteMaitreOuvrage[] = ["promoteur", "mandataire"]

export function FormulaireDevisDommageOuvrage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<DevisDommageOuvrageData>>(initialData)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [siretLoading, setSiretLoading] = useState(false)
  const [siretError, setSiretError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { data?: Partial<DevisDommageOuvrageData>; step?: number }
        if (parsed.data) setData((d) => ({ ...d, ...parsed.data }))
        if (typeof parsed.step === "number" && parsed.step >= 1 && parsed.step <= 5) setStep(parsed.step)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const saveBrouillon = useCallback((d: Partial<DevisDommageOuvrageData>, s?: number) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: d, step: s }))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (submitted) return
    saveBrouillon(data, step)
  }, [data, step, submitted, saveBrouillon])

  const update = (key: keyof DevisDommageOuvrageData, value: unknown) => {
    setData((d) => ({ ...d, [key]: value }))
  }

  const toggleGarantie = (g: GarantieSouhaitee) => {
    const current = (data.garanties || []) as GarantieSouhaitee[]
    const next = current.includes(g) ? current.filter((x) => x !== g) : [...current, g]
    update("garanties", next)
  }

  const coutTotal =
    (Number(data.coutTravauxVrd) || 0) +
    (Number(data.coutMateriauxMaitreOuvrage) || 0) +
    (Number(data.coutControleTechnique) || 0) +
    (Number(data.coutEtudeSol) || 0) +
    (Number(data.coutMaitriseOeuvre) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!devoirConseilAccepte) {
      setSubmitError("Veuillez accepter le devoir de conseil avant d'envoyer votre demande.")
      return
    }
    setSubmitError(null)
    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "formulaire_do", produit: "dommage-ouvrage", email: data.email }),
      })
    } catch {
      /* non bloquant */
    }
    try {
      const res = await fetch("/api/devis-dommage-ouvrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          data,
          coutTotal,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erreur")
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    }
  }

  const tarifEstime = coutTotal > 0 ? calculerTarifDommageOuvrage(coutTotal, { garanties: (data.garanties as GarantieSouhaitee[]) ?? [] }) : null

  if (submitted) {
    return (
      <div className={sectionClass}>
        <h2 className="text-xl font-bold text-black mb-4">Demande envoyée</h2>
        <p className="text-black mb-4">
          Votre demande de devis dommage ouvrage a bien été enregistrée. Notre équipe vous transmettra le prix définitif sous 24h après étude de votre dossier.
        </p>
        <div className="bg-[#F5E8E3] border border-[#E8D5CF] rounded-xl p-4 mb-6">
          <p className="font-semibold text-black mb-2">Prochaines étapes :</p>
          <ol className="text-black text-sm space-y-1 list-decimal list-inside">
            <li>Le devis sera ajouté manuellement à votre espace client</li>
            <li>Signature électronique du contrat (Yousign)</li>
            <li>Validation et paiement par virement bancaire (Mollie)</li>
          </ol>
        </div>
        <p className="text-sm text-black mb-2">
          Coût prévisionnel déclaré : <strong>{coutTotal.toLocaleString("fr-FR")} €</strong>
        </p>
        {tarifEstime && (
          <p className="text-sm text-black mb-4">
            Estimation indicative : <strong>{tarifEstime.primeAnnuelle.toLocaleString("fr-FR")} €</strong> / an
            {(tarifEstime.remiseWeb ?? 0) > 0 && (
              <> (remise web 5 % : -{tarifEstime.remiseWeb!.toLocaleString("fr-FR")} €)</>
            )}
            {(tarifEstime.supplementTrc ?? 0) > 0 && (
              <>{(tarifEstime.remiseWeb ?? 0) > 0 ? ", " : " "}(dont TRC +0,4 % : +{tarifEstime.supplementTrc!.toLocaleString("fr-FR")} €)</>
            )}
            {(tarifEstime.supplementRcmo ?? 0) > 0 && (
              <>{(tarifEstime.remiseWeb ?? 0) > 0 || (tarifEstime.supplementTrc ?? 0) > 0 ? ", " : " "}(dont RCMO +0,2 % : +{tarifEstime.supplementRcmo!.toLocaleString("fr-FR")} €)</>
            )}
            {" "}— prix définitif à la fin de l&apos;étude.
          </p>
        )}
        <div className="flex gap-4">
          <Link href="/" className="text-[#C65D3B] font-medium hover:underline">
            Retour à l&apos;accueil
          </Link>
          <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline">
            Devis décennale BTP
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-black">
      {/* Stepper + progression */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#171717]" aria-live="polite">
          Étape {step} sur {STEPS.length}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Étapes du formulaire">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={step === s.id}
              aria-label={`Étape ${s.id}: ${s.label}`}
              onClick={() => setStep(s.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${
                step === s.id ? "bg-[#C65D3B] text-white" : "bg-[#e4e4e4] border border-[#d4d4d4] text-black font-medium hover:border-[#C65D3B]/50"
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-[#e4e4e4] rounded-full overflow-hidden" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Progression">
          <div className="h-full bg-[#C65D3B] rounded-full transition-all duration-300" style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Souscripteur */}
      {step === 1 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">1. Présentation du souscripteur</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="do-qualite" className={labelClass}>Qualité du maître d&apos;ouvrage *</label>
                <select
                  id="do-qualite"
                  value={data.qualiteMaitreOuvrage || ""}
                  onChange={(e) => update("qualiteMaitreOuvrage", e.target.value as QualiteMaitreOuvrage)}
                  className={inputClass}
                  required
                >
                  {QUALITES_MAITRE_OUVRAGE.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
              {QUALITES_PROFESSIONNELLES.includes(data.qualiteMaitreOuvrage as QualiteMaitreOuvrage) && (
                <div>
                  <label className={labelClass}>Numéro SIRET</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={data.siret || ""}
                      onChange={(e) => update("siret", e.target.value.replace(/\D/g, "").slice(0, 14))}
                      placeholder="12345678900012"
                      maxLength={14}
                      className={`flex-1 ${inputClass} font-mono`}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const s = (data.siret || "").replace(/\s/g, "")
                        if (s.length !== 14) return
                        setSiretLoading(true)
                        setSiretError(null)
                        try {
                          const res = await fetch(`/api/siret?siret=${s}`)
                          const d = await res.json()
                          if (res.ok && d.raisonSociale) {
                            update("raisonSociale", d.raisonSociale)
                            update("adresse", d.adresse || "")
                            update("codePostal", d.codePostal || "")
                            update("ville", d.ville || "")
                          } else {
                            setSiretError(d.error || "Entreprise introuvable. Vérifiez le SIRET.")
                          }
                        } catch {
                          setSiretError("Impossible de récupérer les données. Réessayez.")
                        } finally {
                          setSiretLoading(false)
                        }
                      }}
                      disabled={(data.siret || "").replace(/\s/g, "").length !== 14 || siretLoading}
                      className="bg-[#C65D3B] text-white px-5 py-3.5 rounded-xl hover:bg-[#B04F2F] disabled:bg-[#d4d4d4] font-semibold shrink-0 transition-all"
                    >
                      {siretLoading ? "..." : "Remplir"}
                    </button>
                  </div>
                  <p className="text-xs text-[#171717] mt-1">
                    Saisissez votre SIRET puis cliquez sur Remplir pour pré-remplir vos coordonnées.
                  </p>
                  {siretError && (
                    <p className="mt-2 text-sm text-red-600 font-medium">{siretError}</p>
                  )}
                  <AdresseAutocomplete
                    show={!!siretError}
                    onPick={(a) => {
                      update("adresse", a.adresse)
                      update("codePostal", a.codePostal)
                      update("ville", a.ville)
                      setSiretError(null)
                    }}
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>Nom ou raison sociale du maître d&apos;ouvrage *</label>
                <input
                  type="text"
                  value={data.raisonSociale || ""}
                  onChange={(e) => update("raisonSociale", e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Ex: SCI Dupont"
                />
              </div>
              <div>
                <label className={labelClass}>Adresse *</label>
                <input
                  type="text"
                  value={data.adresse || ""}
                  onChange={(e) => update("adresse", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Code postal *</label>
                  <input
                    type="text"
                    value={data.codePostal || ""}
                    onChange={(e) => update("codePostal", e.target.value)}
                    required
                    maxLength={5}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ville *</label>
                  <input
                    type="text"
                    value={data.ville || ""}
                    onChange={(e) => update("ville", e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Téléphone *</label>
                  <input
                    type="tel"
                    value={data.telephone || ""}
                    onChange={(e) => update("telephone", e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    value={data.email || ""}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              {(data.qualiteMaitreOuvrage as QualiteMaitreOuvrage) === "autre" && (
                <div>
                  <label className={labelClass}>Précisez la qualité</label>
                  <input
                    type="text"
                    value={data.qualiteAutre || ""}
                    onChange={(e) => update("qualiteAutre", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="moSouscripteur"
                  checked={data.maitreOuvrageEstSouscripteur ?? true}
                  onChange={(e) => update("maitreOuvrageEstSouscripteur", e.target.checked)}
                  className="w-5 h-5 rounded border-[#d4d4d4] text-[#C65D3B]"
                />
                <label htmlFor="moSouscripteur" className="text-black font-semibold cursor-pointer">
                  Le maître d&apos;ouvrage est le souscripteur
                </label>
              </div>
              {!data.maitreOuvrageEstSouscripteur && (
                <div>
                  <label className={labelClass}>Coordonnées du proposant</label>
                  <textarea
                    value={data.proposantCoordonnees || ""}
                    onChange={(e) => update("proposantCoordonnees", e.target.value)}
                    className={inputClass}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Opération */}
      {step === 2 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">2. Caractéristiques de l&apos;opération</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Adresse précise de construction *</label>
                <input
                  type="text"
                  value={data.adresseConstruction || ""}
                  onChange={(e) => update("adresseConstruction", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Code postal *</label>
                  <input
                    type="text"
                    value={data.codePostalConstruction || ""}
                    onChange={(e) => update("codePostalConstruction", e.target.value)}
                    required
                    maxLength={5}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ville *</label>
                  <input
                    type="text"
                    value={data.villeConstruction || ""}
                    onChange={(e) => update("villeConstruction", e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>N° permis de construire</label>
                <input
                  type="text"
                  value={data.permisConstruireNumero || ""}
                  onChange={(e) => update("permisConstruireNumero", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Date DROC prévue</label>
                  <input
                    type="date"
                    value={data.dateDroc || ""}
                    onChange={(e) => update("dateDroc", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Début travaux</label>
                  <input
                    type="date"
                    value={data.dateDebutTravaux || ""}
                    onChange={(e) => update("dateDebutTravaux", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Achèvement travaux</label>
                  <input
                    type="date"
                    value={data.dateAchevementTravaux || ""}
                    onChange={(e) => update("dateAchevementTravaux", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Surface de la construction (m²) *</label>
                <input
                  type="number"
                  value={data.surfaceConstruction ?? ""}
                  onChange={(e) => update("surfaceConstruction", e.target.value ? Number(e.target.value) : 0)}
                  required
                  min={1}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Ouvrage & coûts */}
      {step === 3 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">3. Type d&apos;ouvrage</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="do-type-ouvrage" className={labelClass}>Type d&apos;ouvrage *</label>
                <select
                  id="do-type-ouvrage"
                  value={data.typeOuvrage || ""}
                  onChange={(e) => update("typeOuvrage", e.target.value as TypeOuvrage)}
                  className={inputClass}
                  required
                >
                  {TYPES_OUVRAGE.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Superficie (m²) *</label>
                <input
                  type="number"
                  value={data.superficieOuvrage ?? ""}
                  onChange={(e) => update("superficieOuvrage", e.target.value ? Number(e.target.value) : 0)}
                  required
                  min={1}
                  className={inputClass}
                />
              </div>
              {["immeuble_logements", "immeuble_logements_commerces"].includes(data.typeOuvrage || "") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nombre de logements</label>
                    <input
                      type="number"
                      value={data.nbLogements ?? ""}
                      onChange={(e) => update("nbLogements", e.target.value ? Number(e.target.value) : undefined)}
                      min={0}
                      className={inputClass}
                    />
                  </div>
                  {(data.typeOuvrage as TypeOuvrage) === "immeuble_logements_commerces" && (
                    <div>
                      <label className={labelClass}>Surface commerces (m²)</label>
                      <input
                        type="number"
                        value={data.superficieCommerces ?? ""}
                        onChange={(e) => update("superficieCommerces", e.target.value ? Number(e.target.value) : undefined)}
                        min={0}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className={labelClass}>Destination de la construction</label>
                <div className="flex gap-6 mt-2">
                  {(["location", "vente", "exploitation_directe"] as const).map((d) => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                      <input
                        type="radio"
                        name="destination"
                        checked={data.destinationConstruction === d}
                        onChange={() => update("destinationConstruction", d)}
                        className="text-[#C65D3B]"
                      />
                      <span className="text-black capitalize">{d === "exploitation_directe" ? "Exploitation directe" : d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.operationClosCouvert ?? false}
                    onChange={(e) => update("operationClosCouvert", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Opération clos et couvert</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.habitationPrincipaleSecondaire ?? true}
                    onChange={(e) => update("habitationPrincipaleSecondaire", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Habitation principale ou secondaire</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.piscines ?? false}
                    onChange={(e) => update("piscines", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Piscine(s)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.photovoltaiques ?? false}
                    onChange={(e) => update("photovoltaiques", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Photovoltaïques</span>
                </label>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Bâtiments</label>
                  <input
                    type="number"
                    value={data.nbBatiments ?? 1}
                    onChange={(e) => update("nbBatiments", Number(e.target.value) || 1)}
                    min={1}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Étages (R+)</label>
                  <input
                    type="number"
                    value={data.nbEtages ?? 0}
                    onChange={(e) => update("nbEtages", Number(e.target.value) || 0)}
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sous-sols (R-)</label>
                  <input
                    type="number"
                    value={data.nbSousSols ?? 0}
                    onChange={(e) => update("nbSousSols", Number(e.target.value) || 0)}
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                    <input
                      type="checkbox"
                      checked={data.garages ?? false}
                      onChange={(e) => update("garages", e.target.checked)}
                      className="w-5 h-5 rounded text-[#C65D3B]"
                    />
                    <span>Garages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                    <input
                      type="checkbox"
                      checked={data.caves ?? false}
                      onChange={(e) => update("caves", e.target.checked)}
                      className="w-5 h-5 rounded text-[#C65D3B]"
                    />
                    <span>Caves</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Coût prévisionnel de la construction (€)</h3>
            <p className="text-sm text-black mb-4">
              Ce montant sert d&apos;assiette de prime et de limite en cas de sinistre.
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>a) Travaux y compris VRD privatifs</label>
                <input
                  type="number"
                  value={data.coutTravauxVrd ?? ""}
                  onChange={(e) => update("coutTravauxVrd", e.target.value ? Number(e.target.value) : 0)}
                  min={0}
                  step={1000}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>b) Matériaux fournis par le maître d&apos;ouvrage</label>
                <input
                  type="number"
                  value={data.coutMateriauxMaitreOuvrage ?? ""}
                  onChange={(e) => update("coutMateriauxMaitreOuvrage", e.target.value ? Number(e.target.value) : 0)}
                  min={0}
                  step={1000}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>c) Honoraires Contrôle technique</label>
                <input
                  type="number"
                  value={data.coutControleTechnique ?? ""}
                  onChange={(e) => update("coutControleTechnique", e.target.value ? Number(e.target.value) : 0)}
                  min={0}
                  step={100}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>d) Honoraires Étude de sol</label>
                <input
                  type="number"
                  value={data.coutEtudeSol ?? ""}
                  onChange={(e) => update("coutEtudeSol", e.target.value ? Number(e.target.value) : 0)}
                  min={0}
                  step={100}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>e) Honoraires Maîtrise d&apos;œuvre</label>
                <input
                  type="number"
                  value={data.coutMaitriseOeuvre ?? ""}
                  onChange={(e) => update("coutMaitriseOeuvre", e.target.value ? Number(e.target.value) : 0)}
                  min={0}
                  step={1000}
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tvaIncluse"
                  checked={data.coutTvaIncluse ?? true}
                  onChange={(e) => update("coutTvaIncluse", e.target.checked)}
                  className="w-5 h-5 rounded text-[#C65D3B]"
                />
                <label htmlFor="tvaIncluse" className="text-black font-semibold cursor-pointer">Les montants comprennent la TVA</label>
              </div>
              <div className="bg-[#F5E8E3] border border-[#E8D5CF] rounded-xl p-4">
                <p className="font-semibold text-black">
                  Coût total : {coutTotal.toLocaleString("fr-FR")} € {data.coutTvaIncluse ? "TTC" : "HT"}
                </p>
              </div>
              {coutTotal > 0 && (() => {
                const tarif = calculerTarifDommageOuvrage(coutTotal, { garanties: (data.garanties as GarantieSouhaitee[]) ?? [] })
                if (!tarif) return null
                return (
                  <div className="bg-[#FEF3F0] border border-[#C65D3B]/30 rounded-xl p-5">
                    <p className="font-semibold text-black mb-1">Prix approximatif (estimation)</p>
                    {tarif.remiseWeb != null && tarif.remiseWeb > 0 && (
                      <p className="text-sm text-emerald-800 font-medium mb-1">Remise web 5 % sur DO : -{tarif.remiseWeb.toLocaleString("fr-FR")} €</p>
                    )}
                    <p className="text-2xl font-bold text-[#C65D3B]">{tarif.primeAnnuelle.toLocaleString("fr-FR")} € <span className="text-base font-normal text-black">/ an</span></p>
                    {tarif.supplementTrc != null && tarif.supplementTrc > 0 && (
                      <p className="text-sm text-black mt-1">Dont TRC (+0,4 % du chantier) : +{tarif.supplementTrc.toLocaleString("fr-FR")} €</p>
                    )}
                    {tarif.supplementRcmo != null && tarif.supplementRcmo > 0 && (
                      <p className="text-sm text-black mt-1">Dont RCMO (+0,2 % du chantier) : +{tarif.supplementRcmo.toLocaleString("fr-FR")} €</p>
                    )}
                    <p className="text-sm text-black mt-1">Tranche : {tarif.tranche}</p>
                    <p className="text-sm text-black mt-2 font-medium">
                      Prix définitif à la fin de l&apos;étude sous 24h.
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Terrain & technique */}
      {step === 4 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Caractéristiques techniques</h3>
            <div className="space-y-3">
              {[
                { key: "etudeBetonArme" as const, label: "Un bureau d'étude technique effectue-t-il une étude béton armé ?" },
                { key: "techniqueCourante" as const, label: "Les travaux sont-ils réalisés avec des matériaux ou procédés de technique courante ?" },
                { key: "produitsAvisTechnique" as const, label: "Les produits mis en œuvre font-ils l'objet d'un avis technique, ATex ou enquête spécialisée ?" },
                { key: "vitragesAgrafesColles" as const, label: "Les travaux comportent-ils des vitrages extérieurs agrafés ou collés ?" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-[#d4d4d4] last:border-0">
                  <span className="text-black text-sm font-semibold">{label}</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                      <input
                        type="radio"
                        name={key}
                        checked={(data[key] as boolean) === true}
                        onChange={() => update(key, true)}
                        className="text-[#C65D3B]"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                      <input
                        type="radio"
                        name={key}
                        checked={(data[key] as boolean) === false}
                        onChange={() => update(key, false)}
                        className="text-[#C65D3B]"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Caractéristiques du terrain</h3>
            <div className="space-y-3">
              {[
                { key: "distanceMerMoins300m" as const, label: "L'ouvrage est-il à moins de 300 m de la mer ?" },
                { key: "solRemblaiRecent" as const, label: "Le sol est-il constitué de remblai récent ?" },
                { key: "solRemblaisInstables" as const, label: "Le sol est-il constitué de remblais instables ou non compactés ?" },
                { key: "solArgileGonflante" as const, label: "Le sol est-il constitué d'argile gonflante ?" },
                { key: "solTourbeVaseArgile" as const, label: "Présence de tourbe, vase, argiles en couches importantes ou nappe phréatique élevée ?" },
                { key: "solGaleriesMinesDecharges" as const, label: "Sol d'assise sur anciennes galeries (mines…) ou décharges ?" },
                { key: "altitudeSup1000m" as const, label: "Altitude supérieure à 1000 m ?" },
                { key: "merMoins500m" as const, label: "Présence de la mer à moins de 500 m ?" },
                { key: "terrainEnPente" as const, label: "Le terrain est-il en pente ?" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-[#d4d4d4] last:border-0">
                  <span className="text-black text-sm font-semibold">{label}</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                      <input
                        type="radio"
                        name={key}
                        checked={(data[key] as boolean) === true}
                        onChange={() => update(key, true)}
                        className="text-[#C65D3B]"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                      <input
                        type="radio"
                        name={key}
                        checked={(data[key] as boolean) === false}
                        onChange={() => update(key, false)}
                        className="text-[#C65D3B]"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Travaux neufs avec existants</h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                <input
                  type="radio"
                  name="existants"
                  checked={(data.travauxNeufsAvecExistants as boolean) === true}
                  onChange={() => update("travauxNeufsAvecExistants", true)}
                  className="text-[#C65D3B]"
                />
                <span>Oui</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                <input
                  type="radio"
                  name="existants"
                  checked={(data.travauxNeufsAvecExistants as boolean) === false}
                  onChange={() => update("travauxNeufsAvecExistants", false)}
                  className="text-[#C65D3B]"
                />
                <span>Non</span>
              </label>
            </div>
            {data.travauxNeufsAvecExistants && (
              <p className="text-sm text-black">
                Si oui, merci de préciser les interventions dans les commentaires en fin de formulaire. Une annexe détaillée pourra vous être demandée.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Garanties & réalisateurs */}
      {step === 5 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Garanties souhaitées</h3>
            <div className="space-y-3">
              {(Object.keys(GARANTIES_LABELS) as GarantieSouhaitee[]).map((g) => (
                <label key={g} className="flex items-center gap-3 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={(data.garanties as GarantieSouhaitee[])?.includes(g)}
                    onChange={() => toggleGarantie(g)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>{GARANTIES_LABELS[g]}</span>
                </label>
              ))}
              <div className="flex gap-6 mt-4">
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.dommagesBiensEquipement ?? false}
                    onChange={(e) => update("dommagesBiensEquipement", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Dommages aux biens d&apos;équipement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.dommagesExistants ?? false}
                    onChange={(e) => update("dommagesExistants", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Dommages aux existants</span>
                </label>
              </div>
              <div className="mt-4 pt-4 border-t border-[#d4d4d4]">
                <label className="flex items-start gap-3 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.reprisePasse ?? false}
                    onChange={(e) => update("reprisePasse", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B] mt-0.5"
                  />
                  <div>
                    <span>Reprise du passé (jusqu&apos;à 2 ans en arrière)</span>
                    <p className="text-sm font-normal text-black mt-1">
                      Couverture rétroactive des ouvrages jusqu&apos;à 2 ans en arrière, sous réserve de non sinistralité. <strong>Soumis à étude</strong> — pas de tarification immédiate.
                    </p>
                    {data.reprisePasse && (
                      <p className="text-sm text-[#C65D3B] font-medium mt-1">
                        Vous devrez fournir une attestation de non sinistralité sur la période (à déposer dans votre espace client GED).
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Maîtrise d&apos;œuvre</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nom et adresse du maître d&apos;œuvre</label>
                <input
                  type="text"
                  value={data.maitriseOeuvreNom || ""}
                  onChange={(e) => update("maitriseOeuvreNom", e.target.value)}
                  className={inputClass}
                  placeholder="Société ou architecte"
                />
              </div>
              <div>
                <label className={labelClass}>Adresse complète</label>
                <input
                  type="text"
                  value={data.maitriseOeuvreAdresse || ""}
                  onChange={(e) => update("maitriseOeuvreAdresse", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Code postal / Ville</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={data.maitriseOeuvreCodePostal || ""}
                      onChange={(e) => update("maitriseOeuvreCodePostal", e.target.value)}
                      maxLength={5}
                      className={inputClass}
                      placeholder="CP"
                    />
                    <input
                      type="text"
                      value={data.maitriseOeuvreVille || ""}
                      onChange={(e) => update("maitriseOeuvreVille", e.target.value)}
                      className={inputClass}
                      placeholder="Ville"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Téléphone</label>
                  <input
                    type="tel"
                    value={data.maitriseOeuvreTelephone || ""}
                    onChange={(e) => update("maitriseOeuvreTelephone", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.maitriseOeuvreConception ?? false}
                    onChange={(e) => update("maitriseOeuvreConception", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Conception</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.maitriseOeuvreDirectionSurveillance ?? false}
                    onChange={(e) => update("maitriseOeuvreDirectionSurveillance", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Direction et surveillance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black font-semibold">
                  <input
                    type="checkbox"
                    checked={data.maitriseOeuvreMissionComplete ?? true}
                    onChange={(e) => update("maitriseOeuvreMissionComplete", e.target.checked)}
                    className="w-5 h-5 rounded text-[#C65D3B]"
                  />
                  <span>Mission complète</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="moRealiseTravaux"
                  checked={data.maitreOuvrageRealiseTravaux ?? false}
                  onChange={(e) => update("maitreOuvrageRealiseTravaux", e.target.checked)}
                  className="w-5 h-5 rounded text-[#C65D3B]"
                />
                <label htmlFor="moRealiseTravaux" className="text-black font-semibold cursor-pointer">Le maître d&apos;ouvrage réalise-t-il lui-même certains travaux ?</label>
              </div>
              {data.maitreOuvrageRealiseTravaux && (
                <div>
                  <label className={labelClass}>Lesquels ? (le MO ne peut pas intervenir sur le gros œuvre T1–T9, T14)</label>
                  <input
                    type="text"
                    value={data.maitreOuvrageQuelsTravaux || ""}
                    onChange={(e) => update("maitreOuvrageQuelsTravaux", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Contrôle technique & étude de sol</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ct"
                  checked={data.controleTechnique ?? true}
                  onChange={(e) => update("controleTechnique", e.target.checked)}
                  className="w-5 h-5 rounded text-[#C65D3B]"
                />
                <label htmlFor="ct" className="text-black font-semibold cursor-pointer">Intervention d&apos;un contrôleur technique</label>
              </div>
              {data.controleTechnique && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nom du contrôleur</label>
                    <input
                      type="text"
                      value={data.controleTechniqueNom || ""}
                      onChange={(e) => update("controleTechniqueNom", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="do-type-controle" className={labelClass}>Type de contrôle</label>
                    <select
                      id="do-type-controle"
                      value={data.controleTechniqueType || ""}
                      onChange={(e) => update("controleTechniqueType", e.target.value as "L" | "L+E" | "A" | "E")}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      <option value="L">L</option>
                      <option value="L+E">L+E</option>
                      <option value="A">A</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="etudeSol"
                  checked={data.etudeSol ?? true}
                  onChange={(e) => update("etudeSol", e.target.checked)}
                  className="w-5 h-5 rounded text-[#C65D3B]"
                />
                <label htmlFor="etudeSol" className="text-black font-semibold cursor-pointer">Une étude de sol est réalisée</label>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold text-black mb-4">Organisation des travaux</h3>
            <div>
              <label htmlFor="do-type-contrat" className={labelClass}>L&apos;opération est confiée à</label>
              <select
                id="do-type-contrat"
                value={data.typeContrat || ""}
                onChange={(e) => update("typeContrat", e.target.value as TypeContrat)}
                className={inputClass}
              >
                {TYPES_CONTRAT.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={sectionClass}>
            <label className={labelClass}>Commentaires complémentaires</label>
            <textarea
              value={data.commentaires || ""}
              onChange={(e) => update("commentaires", e.target.value)}
              className={inputClass}
              rows={4}
              placeholder="Informations supplémentaires, existants, annexes..."
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <DevoirConseil
          produit="dommage-ouvrage"
          checkboxId="devoir-conseil-do"
          checked={devoirConseilAccepte}
          onCheckedChange={setDevoirConseilAccepte}
          labelCheckbox="J'ai pris connaissance des garanties et conditions. Ma demande correspond à ma situation de maître d'ouvrage."
          compact
        />
      )}

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-6 py-3 rounded-xl border border-[#d4d4d4] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#C65D3B]/50 transition bg-[#e4e4e4]"
        >
          ← Précédent
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="px-6 py-3 bg-[#C65D3B] text-white rounded-xl hover:bg-[#B04F2F] font-semibold transition"
          >
            Suivant →
          </button>
        ) : (
          <button
            type="submit"
            disabled={!devoirConseilAccepte}
            className="px-8 py-3 bg-[#C65D3B] text-white rounded-xl hover:bg-[#B04F2F] font-semibold transition shadow-md shadow-[#C65D3B]/20 disabled:bg-[#d4d4d4] disabled:cursor-not-allowed"
          >
            Envoyer ma demande
          </button>
        )}
      </div>
    </form>
  )
}
