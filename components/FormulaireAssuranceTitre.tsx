"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ASSURANCE_TITRE_BESOIN_OPTIONS,
  ASSURANCE_TITRE_BIEN_OPTIONS,
  ASSURANCE_TITRE_OPERATION_OPTIONS,
  ASSURANCE_TITRE_PROFIL_OPTIONS,
  ASSURANCE_TITRE_RISQUE_OPTIONS,
  type AssuranceTitreBesoinPrincipal,
  type AssuranceTitreData,
  type AssuranceTitreProfilSouscripteur,
  type AssuranceTitreRisqueIdentifie,
  type AssuranceTitreTypeBien,
  type AssuranceTitreTypeOperation,
} from "@/lib/assurance-titre-types"
import { inputFieldBg, inputTextDark } from "@/lib/form-input-styles"
import { readResponseJson } from "@/lib/read-response-json"
import {
  hasConversionTrackingContext,
  readConversionTrackingContext,
  type ConversionTrackingContext,
} from "@/lib/conversion-tracking"

const STORAGE_KEY = "optimum-assurance-titre-brouillon"
const inputClass = `w-full rounded-xl px-4 py-3.5 font-semibold ${inputFieldBg} ${inputTextDark}`
const labelClass = "mb-2 block text-sm font-semibold text-slate-900"
const sectionClass = "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"

const initialData: Partial<AssuranceTitreData> = {
  financementExterne: false,
  risquesIdentifies: [],
}

function isValidEmail(value?: string | null): boolean {
  const email = value?.trim() || ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeSiret(value?: string | null): string {
  return (value || "").replace(/\D/g, "").slice(0, 14)
}

function isValidOptionalSiret(value?: string | null): boolean {
  const siret = normalizeSiret(value)
  return siret.length === 0 || /^\d{14}$/.test(siret)
}

function isBlank(value?: string | null): boolean {
  return !(value?.trim() || "")
}

export function FormulaireAssuranceTitre() {
  const [email, setEmail] = useState("")
  const [data, setData] = useState<Partial<AssuranceTitreData>>(initialData)
  const [accepte, setAccepte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [trackingContext, setTrackingContext] = useState<ConversionTrackingContext | null>(null)
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          email?: string
          data?: Partial<AssuranceTitreData>
          accepte?: boolean
          tracking?: ConversionTrackingContext
        }
        if (parsed.email) setEmail(parsed.email)
        if (parsed.data) setData((current) => ({ ...current, ...parsed.data }))
        if (parsed.accepte === true) setAccepte(true)
        if (parsed.tracking && typeof parsed.tracking === "object") {
          setTrackingContext(parsed.tracking)
        }
      }
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams(window.location.search)
    const tracking = readConversionTrackingContext(params, document.referrer)
    if (hasConversionTrackingContext(tracking)) {
      setTrackingContext(tracking)
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady || submitted || typeof window === "undefined") return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email,
          data,
          accepte,
          ...(hasConversionTrackingContext(trackingContext) ? { tracking: trackingContext } : {}),
        })
      )
    } catch {
      /* ignore */
    }
  }, [email, data, accepte, trackingContext, storageReady, submitted])

  const update = <K extends keyof AssuranceTitreData>(key: K, value: AssuranceTitreData[K] | undefined) => {
    setData((current) => ({ ...current, [key]: value }))
  }

  const toggleRisk = (risk: AssuranceTitreRisqueIdentifie) => {
    setData((current) => {
      const currentRisks = (current.risquesIdentifies || []) as AssuranceTitreRisqueIdentifie[]
      const nextRisks = currentRisks.includes(risk)
        ? currentRisks.filter((item) => item !== risk)
        : [...currentRisks, risk]
      return { ...current, risquesIdentifies: nextRisks }
    })
  }

  const getValidationError = (): string | null => {
    if (!isValidEmail(email)) return "Renseignez un e-mail valide."
    if (isBlank(data.nomComplet)) return "Indiquez votre nom et prénom."
    if (isBlank(data.telephone)) return "Indiquez un téléphone de contact."
    if (!data.profilSouscripteur) return "Choisissez le profil du souscripteur."
    if (!data.typeOperation) return "Choisissez le type d'opération."
    if (!data.typeBien) return "Choisissez le type de bien."
    if (!data.besoinPrincipal) return "Précisez le besoin principal."
    if (isBlank(data.adresseBien)) return "Indiquez l'adresse du bien."
    if (isBlank(data.codePostalBien)) return "Indiquez le code postal du bien."
    if (isBlank(data.villeBien)) return "Indiquez la ville du bien."
    if ((Number(data.montantOperation) || 0) <= 0) return "Indiquez un montant d'opération exploitable."
    if (!isValidOptionalSiret(data.siret)) return "Le SIRET doit contenir 14 chiffres."
    if (
      data.besoinPrincipal === "anomalie_identifiee" &&
      (data.message?.trim().length || 0) < 20
    ) {
      return "Décrivez l'anomalie identifiée en quelques mots."
    }
    if (!accepte) return "Veuillez accepter l'utilisation de vos données pour traiter votre demande."
    return null
  }

  const canSubmit = getValidationError() === null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const error = getValidationError()
    if (error) {
      setSubmitError(error)
      return
    }

    setLoading(true)
    try {
      const payload: AssuranceTitreData = {
        nomComplet: data.nomComplet!.trim(),
        telephone: data.telephone!.trim(),
        profilSouscripteur: data.profilSouscripteur as AssuranceTitreProfilSouscripteur,
        typeOperation: data.typeOperation as AssuranceTitreTypeOperation,
        typeBien: data.typeBien as AssuranceTitreTypeBien,
        besoinPrincipal: data.besoinPrincipal as AssuranceTitreBesoinPrincipal,
        adresseBien: data.adresseBien!.trim(),
        codePostalBien: data.codePostalBien!.trim(),
        villeBien: data.villeBien!.trim(),
        montantOperation: Number(data.montantOperation),
        financementExterne: Boolean(data.financementExterne),
        risquesIdentifies: (data.risquesIdentifies || []) as AssuranceTitreRisqueIdentifie[],
        ...(data.raisonSociale?.trim() ? { raisonSociale: data.raisonSociale.trim() } : {}),
        ...(normalizeSiret(data.siret) ? { siret: normalizeSiret(data.siret) } : {}),
        ...(data.dateSignaturePrevue?.trim() ? { dateSignaturePrevue: data.dateSignaturePrevue.trim() } : {}),
        ...(data.message?.trim() ? { message: data.message.trim().slice(0, 4000) } : {}),
      }

      const response = await fetch("/api/devis-assurance-titre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          data: payload,
          ...(hasConversionTrackingContext(trackingContext) ? { tracking: trackingContext } : {}),
        }),
      })
      const json = await readResponseJson<{ error?: string }>(response)
      if (!response.ok) {
        throw new Error(json.error || "Envoi impossible")
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY)
      }
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 text-center">
        <p className="mb-2 text-lg font-semibold text-emerald-900">Demande envoyée</p>
        <p className="mb-6 text-sm leading-relaxed text-slate-700">
          Nous avons bien reçu votre demande d&apos;étude <strong>Assurance titre</strong>. Un conseiller revient vers
          vous en général sous <strong>24 à 48 h ouvrées</strong> après lecture du dossier.
        </p>
        <Link href="/" className="font-semibold text-blue-600 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Étude confidentielle sur dossier</p>
        <p className="mt-1 leading-relaxed">
          Complément aux vérifications notariales et juridiques : nous analysons votre opération, les points de risque
          identifiés et la faisabilité d&apos;une couverture adaptée.
        </p>
        <p className="mt-2 text-xs text-slate-600">Brouillon auto-sauvegardé sur cet appareil pendant votre saisie.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Réponse rapide</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">Retour initial en général sous 24 à 48 h ouvrées.</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-950">Dossier qualifié</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-900">Type d&apos;actif, opération, risque et calendrier centralisés en un seul formulaire.</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-950">Produit étudié au cas par cas</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-900">Pas de tarificateur public : montage selon l&apos;actif, les antécédents et les exclusions applicables.</p>
        </div>
      </div>

      <section className={sectionClass}>
        <h2 className="mb-4 text-base font-bold text-slate-900">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title-email" className={labelClass}>
              E-mail de contact <span className="text-red-600">*</span>
            </label>
            <input
              id="title-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="vous@entreprise.fr"
              required
            />
          </div>
          <div>
            <label htmlFor="title-phone" className={labelClass}>
              Téléphone <span className="text-red-600">*</span>
            </label>
            <input
              id="title-phone"
              type="tel"
              autoComplete="tel"
              value={data.telephone ?? ""}
              onChange={(event) => update("telephone", event.target.value)}
              className={inputClass}
              placeholder="06 12 34 56 78"
              required
            />
          </div>
          <div>
            <label htmlFor="title-name" className={labelClass}>
              Nom et prénom / interlocuteur <span className="text-red-600">*</span>
            </label>
            <input
              id="title-name"
              type="text"
              value={data.nomComplet ?? ""}
              onChange={(event) => update("nomComplet", event.target.value)}
              className={inputClass}
              placeholder="Marie Dupont"
              required
            />
          </div>
          <div>
            <label htmlFor="title-company" className={labelClass}>
              Société / structure <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input
              id="title-company"
              type="text"
              value={data.raisonSociale ?? ""}
              onChange={(event) => update("raisonSociale", event.target.value)}
              className={inputClass}
              placeholder="Holding Immo Alpha"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="title-siret" className={labelClass}>
              SIRET <span className="font-normal text-slate-500">(optionnel, 14 chiffres)</span>
            </label>
            <input
              id="title-siret"
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={data.siret ?? ""}
              onChange={(event) => update("siret", normalizeSiret(event.target.value))}
              className={`${inputClass} font-mono`}
              placeholder="12345678900012"
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 text-base font-bold text-slate-900">Votre opération immobilière</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title-profile" className={labelClass}>
              Profil du souscripteur <span className="text-red-600">*</span>
            </label>
            <select
              id="title-profile"
              value={data.profilSouscripteur ?? ""}
              onChange={(event) =>
                update("profilSouscripteur", (event.target.value || undefined) as AssuranceTitreProfilSouscripteur)
              }
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">— Choisir —</option>
              {ASSURANCE_TITRE_PROFIL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title-operation" className={labelClass}>
              Type d&apos;opération <span className="text-red-600">*</span>
            </label>
            <select
              id="title-operation"
              value={data.typeOperation ?? ""}
              onChange={(event) =>
                update("typeOperation", (event.target.value || undefined) as AssuranceTitreTypeOperation)
              }
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">— Choisir —</option>
              {ASSURANCE_TITRE_OPERATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title-asset" className={labelClass}>
              Type de bien <span className="text-red-600">*</span>
            </label>
            <select
              id="title-asset"
              value={data.typeBien ?? ""}
              onChange={(event) => update("typeBien", (event.target.value || undefined) as AssuranceTitreTypeBien)}
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">— Choisir —</option>
              {ASSURANCE_TITRE_BIEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title-need" className={labelClass}>
              Besoin principal <span className="text-red-600">*</span>
            </label>
            <select
              id="title-need"
              value={data.besoinPrincipal ?? ""}
              onChange={(event) =>
                update("besoinPrincipal", (event.target.value || undefined) as AssuranceTitreBesoinPrincipal)
              }
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">— Choisir —</option>
              {ASSURANCE_TITRE_BESOIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 text-base font-bold text-slate-900">Bien, montant et calendrier</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title-address" className={labelClass}>
              Adresse du bien <span className="text-red-600">*</span>
            </label>
            <input
              id="title-address"
              type="text"
              value={data.adresseBien ?? ""}
              onChange={(event) => update("adresseBien", event.target.value)}
              className={inputClass}
              placeholder="12 rue des Fleurs"
              required
            />
          </div>
          <div>
            <label htmlFor="title-zip" className={labelClass}>
              Code postal <span className="text-red-600">*</span>
            </label>
            <input
              id="title-zip"
              type="text"
              value={data.codePostalBien ?? ""}
              onChange={(event) => update("codePostalBien", event.target.value)}
              className={inputClass}
              placeholder="75008"
              required
            />
          </div>
          <div>
            <label htmlFor="title-city" className={labelClass}>
              Ville <span className="text-red-600">*</span>
            </label>
            <input
              id="title-city"
              type="text"
              value={data.villeBien ?? ""}
              onChange={(event) => update("villeBien", event.target.value)}
              className={inputClass}
              placeholder="Paris"
              required
            />
          </div>
          <div>
            <label htmlFor="title-amount" className={labelClass}>
              Montant de l&apos;opération (€) <span className="text-red-600">*</span>
            </label>
            <input
              id="title-amount"
              type="number"
              min={0}
              step={1000}
              value={data.montantOperation ?? ""}
              onChange={(event) =>
                update("montantOperation", event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={inputClass}
              placeholder="250000"
              required
            />
          </div>
          <div>
            <label htmlFor="title-date" className={labelClass}>
              Date cible de signature <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input
              id="title-date"
              type="date"
              value={data.dateSignaturePrevue ?? ""}
              onChange={(event) => update("dateSignaturePrevue", event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(data.financementExterne)}
                onChange={(event) => update("financementExterne", event.target.checked)}
                className="mt-1 rounded border-slate-300"
              />
              <span>
                Un prêteur, investisseur ou partenaire financier est impliqué dans le dossier.
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 text-base font-bold text-slate-900">Points de vigilance connus</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSURANCE_TITRE_RISQUE_OPTIONS.map((option) => {
            const checked = ((data.risquesIdentifies || []) as AssuranceTitreRisqueIdentifie[]).includes(option.value)
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  checked ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRisk(option.value)}
                  className="mt-1 rounded border-slate-300"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
        <div className="mt-4">
          <label htmlFor="title-message" className={labelClass}>
            Précisions utiles <span className="font-normal text-slate-500">(obligatoire si anomalie déjà identifiée)</span>
          </label>
          <textarea
            id="title-message"
            rows={5}
            value={data.message ?? ""}
            onChange={(event) => update("message", event.target.value)}
            className={`${inputClass} min-h-[140px] resize-y`}
            placeholder="Décrivez la transaction, les recherches déjà menées, les anomalies relevées ou les contraintes de timing."
          />
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={accepte}
          onChange={(event) => setAccepte(event.target.checked)}
          className="mt-1 rounded border-slate-300"
        />
        <span>
          J&apos;accepte que mes données soient utilisées pour traiter ma demande, conformément à la{" "}
          <Link href="/confidentialite" className="font-semibold text-blue-600 hover:underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}
      {!canSubmit ? (
        <p className="text-xs text-slate-500">Complétez les champs obligatoires pour envoyer votre demande.</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-center font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Envoi en cours..." : "Envoyer ma demande"}
      </button>
    </form>
  )
}
