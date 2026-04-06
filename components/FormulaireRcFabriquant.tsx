"use client"

import { useState } from "react"
import Link from "next/link"
import type { DevisRcFabriquantData, RcTypeProduit, RcZoneDistribution } from "@/lib/rc-fabriquant-types"
import {
  RC_FABRIQUANT_STEPS,
  RC_TYPE_PRODUIT_OPTIONS,
  RC_ZONE_DISTRIBUTION_OPTIONS,
} from "@/lib/rc-fabriquant-questionnaire"
import { readResponseJson } from "@/lib/read-response-json"

const initial: DevisRcFabriquantData = {
  raisonSociale: "",
  siret: "",
  telephone: "",
  activiteFabrication: "",
  anneeCreation: undefined,
  typeProduit: undefined,
  zoneDistribution: undefined,
  sousTraitance: false,
  controleQualite: false,
  certification: false,
  testsSecurite: false,
  caAnnuelTotal: undefined,
  caExport: undefined,
  sinistres5Ans: undefined,
  montantSinistres: undefined,
  effectifs: "",
  zonesCommercialisation: "",
  message: "",
}

function normalizeSiret(raw: string): string {
  return raw.replace(/\s/g, "").trim()
}

function isValidSiret(s: string): boolean {
  return /^\d{14}$/.test(s)
}

function needsCertQuestions(t?: RcTypeProduit): boolean {
  return t === "batterie" || t === "electronique"
}

export function FormulaireRcFabriquant() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [data, setData] = useState<DevisRcFabriquantData>(initial)
  const [accepte, setAccepte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const update = <K extends keyof DevisRcFabriquantData>(key: K, value: DevisRcFabriquantData[K]) => {
    setData((d) => ({ ...d, [key]: value }))
  }

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "E-mail professionnel invalide."
      if (!data.raisonSociale.trim()) return "Indiquez la raison sociale."
      const siret = normalizeSiret(data.siret)
      if (!isValidSiret(siret)) return "SIRET requis : 14 chiffres."
      if (!data.telephone.trim()) return "Téléphone requis."
      if (!data.activiteFabrication.trim()) return "Décrivez vos produits / procédés."
    }
    if (s === 1) {
      if (!data.typeProduit) return "Choisissez un type de produit."
      if (!data.zoneDistribution) return "Choisissez une zone de distribution."
    }
    if (s === 2) {
      if (data.caAnnuelTotal == null || !Number.isFinite(data.caAnnuelTotal) || data.caAnnuelTotal <= 0) {
        return "Indiquez un chiffre d’affaires annuel total valide (€)."
      }
    }
    return null
  }

  const next = () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep((x) => Math.min(x + 1, RC_FABRIQUANT_STEPS.length - 1))
  }

  const prev = () => {
    setError(null)
    setStep((x) => Math.max(x - 1, 0))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const err = validateStep(0) || validateStep(1) || validateStep(2)
    if (err) {
      setError(err)
      return
    }
    if (!accepte) {
      setError("Veuillez accepter l’utilisation de vos données pour traiter votre demande.")
      return
    }
    setLoading(true)
    try {
      const siret = normalizeSiret(data.siret)
      const payload: DevisRcFabriquantData = {
        raisonSociale: data.raisonSociale.trim(),
        siret,
        telephone: data.telephone.trim(),
        activiteFabrication: data.activiteFabrication.trim(),
        typeProduit: data.typeProduit,
        zoneDistribution: data.zoneDistribution,
        sousTraitance: Boolean(data.sousTraitance),
        controleQualite: Boolean(data.controleQualite),
        certification: Boolean(data.certification),
        testsSecurite: Boolean(data.testsSecurite),
        caAnnuelTotal: data.caAnnuelTotal!,
        ...(data.anneeCreation != null && data.anneeCreation > 1800 && data.anneeCreation <= new Date().getFullYear()
          ? { anneeCreation: Math.floor(data.anneeCreation) }
          : {}),
        ...(data.caExport != null && data.caExport >= 0 ? { caExport: data.caExport } : {}),
        ...(data.sinistres5Ans != null && data.sinistres5Ans >= 0
          ? { sinistres5Ans: Math.floor(data.sinistres5Ans) }
          : {}),
        ...(data.montantSinistres != null && data.montantSinistres >= 0
          ? { montantSinistres: data.montantSinistres }
          : {}),
        ...(data.effectifs?.trim() ? { effectifs: data.effectifs.trim() } : {}),
        ...(data.zonesCommercialisation?.trim()
          ? { zonesCommercialisation: data.zonesCommercialisation.trim() }
          : {}),
        ...(data.message?.trim() ? { message: data.message.trim().slice(0, 4000) } : {}),
      }
      const res = await fetch("/api/devis-rc-fabriquant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), data: payload }),
      })
      const json = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(json.error || "Envoi impossible")
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-900 mb-2">Demande envoyée</p>
        <p className="text-slate-700 text-sm mb-6">
          Nous avons bien reçu votre demande de devis RC Fabriquant. Un conseiller vous recontacte en général sous{" "}
          <strong>24 à 48 h ouvrées</strong>. Un email de confirmation vient de vous être envoyé.
        </p>
        <Link href="/" className="text-blue-600 font-semibold hover:underline">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  const certVisible = needsCertQuestions(data.typeProduit)

  return (
    <form onSubmit={step === RC_FABRIQUANT_STEPS.length - 1 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6 max-w-xl">
      <div className="flex gap-2 mb-2" aria-hidden>
        {RC_FABRIQUANT_STEPS.map((st, i) => (
          <div
            key={st.id}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blue-600" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-slate-700">
        Étape {step + 1} / {RC_FABRIQUANT_STEPS.length} — {RC_FABRIQUANT_STEPS[step].title}
      </p>

      {step === 0 && (
        <>
          <div>
            <label htmlFor="rc-email" className="block text-sm font-medium text-slate-800 mb-1">
              E-mail professionnel <span className="text-red-600">*</span>
            </label>
            <input
              id="rc-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-rs" className="block text-sm font-medium text-slate-800 mb-1">
              Raison sociale <span className="text-red-600">*</span>
            </label>
            <input
              id="rc-rs"
              type="text"
              required
              value={data.raisonSociale}
              onChange={(e) => update("raisonSociale", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-siret" className="block text-sm font-medium text-slate-800 mb-1">
              SIRET <span className="text-red-600">*</span> <span className="text-slate-500 font-normal">14 chiffres</span>
            </label>
            <input
              id="rc-siret"
              type="text"
              inputMode="numeric"
              required
              value={data.siret}
              onChange={(e) => update("siret", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-tel" className="block text-sm font-medium text-slate-800 mb-1">
              Téléphone <span className="text-red-600">*</span>
            </label>
            <input
              id="rc-tel"
              type="tel"
              autoComplete="tel"
              required
              value={data.telephone}
              onChange={(e) => update("telephone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-act" className="block text-sm font-medium text-slate-800 mb-1">
              Activité / produits fabriqués <span className="text-red-600">*</span>
            </label>
            <textarea
              id="rc-act"
              required
              rows={4}
              value={data.activiteFabrication}
              onChange={(e) => update("activiteFabrication", e.target.value)}
              placeholder="Ex. fabrication de batteries lithium, équipements électroniques, cosmétiques…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y min-h-[100px]"
            />
          </div>
          <div>
            <label htmlFor="rc-annee" className="block text-sm font-medium text-slate-800 mb-1">
              Année de création <span className="text-slate-500 font-normal">(optionnel)</span>
            </label>
            <input
              id="rc-annee"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={data.anneeCreation ?? ""}
              onChange={(e) => {
                const v = e.target.value
                update("anneeCreation", v === "" ? undefined : Number(v))
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div>
            <label htmlFor="rc-type" className="block text-sm font-medium text-slate-800 mb-1">
              Type de produit <span className="text-red-600">*</span>
            </label>
            <select
              id="rc-type"
              required
              value={data.typeProduit ?? ""}
              onChange={(e) =>
                update("typeProduit", (e.target.value || undefined) as RcTypeProduit | undefined)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
            >
              <option value="">— Choisir —</option>
              {RC_TYPE_PRODUIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rc-zone" className="block text-sm font-medium text-slate-800 mb-1">
              Zone de distribution <span className="text-red-600">*</span>
            </label>
            <select
              id="rc-zone"
              required
              value={data.zoneDistribution ?? ""}
              onChange={(e) =>
                update("zoneDistribution", (e.target.value || undefined) as RcZoneDistribution | undefined)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
            >
              <option value="">— Choisir —</option>
              {RC_ZONE_DISTRIBUTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(data.sousTraitance)}
                onChange={(e) => update("sousTraitance", e.target.checked)}
                className="rounded border-slate-300"
              />
              Sous-traitance significative
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(data.controleQualite)}
                onChange={(e) => update("controleQualite", e.target.checked)}
                className="rounded border-slate-300"
              />
              Contrôle qualité formalisé
            </label>
            {certVisible ? (
              <>
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(data.certification)}
                    onChange={(e) => update("certification", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Produits certifiés CE / normes sécurité applicables
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(data.testsSecurite)}
                    onChange={(e) => update("testsSecurite", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Tests thermiques / sécurité effectués
                </label>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Pour les batteries, l’absence de certification ou de tests est un critère d’étude renforcée côté assureur.
                </p>
              </>
            ) : null}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <label htmlFor="rc-ca" className="block text-sm font-medium text-slate-800 mb-1">
              CA annuel total estimé (€) <span className="text-red-600">*</span>
            </label>
            <input
              id="rc-ca"
              type="number"
              min={1}
              step={1000}
              required
              value={data.caAnnuelTotal ?? ""}
              onChange={(e) => {
                const v = e.target.value
                update("caAnnuelTotal", v === "" ? undefined : Number(v))
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-caexp" className="block text-sm font-medium text-slate-800 mb-1">
              CA export (€) <span className="text-slate-500 font-normal">(optionnel)</span>
            </label>
            <input
              id="rc-caexp"
              type="number"
              min={0}
              step={1000}
              value={data.caExport ?? ""}
              onChange={(e) => {
                const v = e.target.value
                update("caExport", v === "" ? undefined : Number(v))
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-eff" className="block text-sm font-medium text-slate-800 mb-1">
              Effectifs <span className="text-slate-500 font-normal">(optionnel)</span>
            </label>
            <input
              id="rc-eff"
              type="text"
              value={data.effectifs ?? ""}
              onChange={(e) => update("effectifs", e.target.value)}
              placeholder="Ex. 1–5, 10–20…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rc-zone-libre" className="block text-sm font-medium text-slate-800 mb-1">
              Précisions zone / pays <span className="text-slate-500 font-normal">(optionnel)</span>
            </label>
            <input
              id="rc-zone-libre"
              type="text"
              value={data.zonesCommercialisation ?? ""}
              onChange={(e) => update("zonesCommercialisation", e.target.value)}
              placeholder="Ex. USA, Royaume-Uni, DROM…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rc-sin" className="block text-sm font-medium text-slate-800 mb-1">
                Sinistres sur 5 ans (nombre)
              </label>
              <input
                id="rc-sin"
                type="number"
                min={0}
                step={1}
                value={data.sinistres5Ans ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  update("sinistres5Ans", v === "" ? undefined : Number(v))
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div>
              <label htmlFor="rc-sinm" className="block text-sm font-medium text-slate-800 mb-1">
                Montant sinistres (€)
              </label>
              <input
                id="rc-sinm"
                type="number"
                min={0}
                step={100}
                value={data.montantSinistres ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  update("montantSinistres", v === "" ? undefined : Number(v))
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="rc-msg" className="block text-sm font-medium text-slate-800 mb-1">
              Précisions utiles
            </label>
            <textarea
              id="rc-msg"
              rows={3}
              value={data.message ?? ""}
              onChange={(e) => update("message", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              className="mt-1 rounded border-slate-300"
            />
            <span>
              J’accepte que mes données soient utilisées pour traiter ma demande de devis, conformément à la{" "}
              <Link href="/confidentialite" className="text-blue-600 hover:underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
        </>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={prev}
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50"
          >
            Retour
          </button>
        ) : null}
        {step < RC_FABRIQUANT_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-blue-600 text-white font-semibold px-8 py-3 hover:bg-blue-700"
          >
            Continuer
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 text-white font-semibold px-8 py-3 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Envoyer ma demande"}
          </button>
        )}
      </div>
    </form>
  )
}
