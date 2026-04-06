"use client"

import { useState } from "react"
import Link from "next/link"
import type { DevisRcFabriquantData } from "@/lib/rc-fabriquant-types"
import { readResponseJson } from "@/lib/read-response-json"

const initial: DevisRcFabriquantData = {
  raisonSociale: "",
  siret: "",
  telephone: "",
  activiteFabrication: "",
  chiffreAffairesAnnuel: undefined,
  effectifs: "",
  zonesCommercialisation: "",
  message: "",
}

export function FormulaireRcFabriquant() {
  const [email, setEmail] = useState("")
  const [data, setData] = useState<DevisRcFabriquantData>(initial)
  const [accepte, setAccepte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const update = <K extends keyof DevisRcFabriquantData>(key: K, value: DevisRcFabriquantData[K]) => {
    setData((d) => ({ ...d, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!accepte) {
      setError("Veuillez accepter l’utilisation de vos données pour traiter votre demande.")
      return
    }
    setLoading(true)
    try {
      const payload: DevisRcFabriquantData = {
        raisonSociale: data.raisonSociale.trim(),
        telephone: data.telephone.trim(),
        activiteFabrication: data.activiteFabrication.trim(),
        ...(data.siret?.trim() ? { siret: data.siret.replace(/\s/g, "").trim() } : {}),
        ...(data.chiffreAffairesAnnuel != null && data.chiffreAffairesAnnuel >= 0
          ? { chiffreAffairesAnnuel: data.chiffreAffairesAnnuel }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
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
          SIRET <span className="text-slate-500 font-normal">(optionnel)</span>
        </label>
        <input
          id="rc-siret"
          type="text"
          inputMode="numeric"
          value={data.siret ?? ""}
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
          Produits fabriqués / procédés <span className="text-red-600">*</span>
        </label>
        <textarea
          id="rc-act"
          required
          rows={4}
          value={data.activiteFabrication}
          onChange={(e) => update("activiteFabrication", e.target.value)}
          placeholder="Ex. fabrication de composants électroniques, équipements médicaux, denrées alimentaires emballées…"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y min-h-[100px]"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rc-ca" className="block text-sm font-medium text-slate-800 mb-1">
            CA annuel estimé (€)
          </label>
          <input
            id="rc-ca"
            type="number"
            min={0}
            step={1000}
            value={data.chiffreAffairesAnnuel ?? ""}
            onChange={(e) => {
              const v = e.target.value
              update("chiffreAffairesAnnuel", v === "" ? undefined : Number(v))
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
        <div>
          <label htmlFor="rc-eff" className="block text-sm font-medium text-slate-800 mb-1">
            Effectifs
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
      </div>
      <div>
        <label htmlFor="rc-zone" className="block text-sm font-medium text-slate-800 mb-1">
          Zones de commercialisation
        </label>
        <input
          id="rc-zone"
          type="text"
          value={data.zonesCommercialisation ?? ""}
          onChange={(e) => update("zonesCommercialisation", e.target.value)}
          placeholder="France, UE, hors UE, export USA…"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto rounded-xl bg-blue-600 text-white font-semibold px-8 py-3.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  )
}
