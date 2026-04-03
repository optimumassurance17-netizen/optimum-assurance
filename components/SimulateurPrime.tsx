"use client"

import { useState } from "react"
import Link from "next/link"
import { calculerTarif } from "@/lib/tarification"
import { equivMensuelDepuisAnnuel, formatEurosFR } from "@/lib/decennale-affichage-tarif"
import { CA_MINIMUM } from "@/lib/tarification"
import { ACTIVITES_AVEC_TARIFS } from "@/lib/activites-btp"

/** Ordre stable des catégories (évite un <select> à ~110 options : DOM plus léger, audits Lighthouse). */
const CATEGORIES_SIMULATEUR: string[] = (() => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of ACTIVITES_AVEC_TARIFS) {
    if (!seen.has(t.categorie)) {
      seen.add(t.categorie)
      out.push(t.categorie)
    }
  }
  return out
})()

function activitesDansCategorie(categorie: string) {
  return ACTIVITES_AVEC_TARIFS.filter((t) => t.categorie === categorie)
}

export function SimulateurPrime() {
  const [chiffreAffaires, setChiffreAffaires] = useState<string>("80000")
  const [categorie, setCategorie] = useState<string>(ACTIVITES_AVEC_TARIFS[0].categorie)
  const [activite, setActivite] = useState<string>(ACTIVITES_AVEC_TARIFS[0].activite)
  const [resultat, setResultat] = useState<{ prime: number; economie: number } | null>(null)

  const calculer = () => {
    const ca = Number(chiffreAffaires) || 0
    if (ca < CA_MINIMUM) return
    const tarif = calculerTarif({
      chiffreAffaires: ca,
      sinistres: 0,
      jamaisAssure: false,
      activites: [activite],
    })
    const prixConcurrent = Math.round(tarif.primeAnnuelle * 1.3)
    const economie = prixConcurrent - tarif.primeAnnuelle
    setResultat({ prime: tarif.primeAnnuelle, economie })
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-900/5">
      <h2 className="mb-6 text-lg font-bold text-slate-900">Estimez votre prime en 30 secondes</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Chiffre d&apos;affaires (€)
            <input
              type="number"
              value={chiffreAffaires}
              onChange={(e) => { setResultat(null); setChiffreAffaires(e.target.value) }}
              min={CA_MINIMUM}
              step="10000"
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-[var(--input-bg)] px-4 py-3 font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <p className="mt-1.5 text-xs italic text-slate-700">
            Les CA sont contrôlés chaque année (greffe, impôts). Bien indiquer le bon chiffre évite les régularisations.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Catégorie
            <select
              value={categorie}
              onChange={(e) => {
                const cat = e.target.value
                setResultat(null)
                setCategorie(cat)
                const liste = activitesDansCategorie(cat)
                if (liste[0]) setActivite(liste[0].activite)
              }}
              className="mt-2 block w-full border border-[#d4d4d4] rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb] outline-none transition-all text-[#0a0a0a] font-medium bg-[#e4e4e4] touch-manipulation min-h-[48px]"
            >
              {CATEGORIES_SIMULATEUR.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Activité (taux et prime min du PDF)
            <select
              value={activite}
              onChange={(e) => { setResultat(null); setActivite(e.target.value) }}
              className="mt-2 block w-full border border-[#d4d4d4] rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb] outline-none transition-all text-[#0a0a0a] font-medium bg-[#e4e4e4] touch-manipulation min-h-[48px]"
            >
              {activitesDansCategorie(categorie).map((t) => (
                <option key={t.activite} value={t.activite}>
                  {t.activite} — {t.activite === "Nettoyage toiture et peinture résine (I3 à I5)"
                    ? "1.7% / 2% au-dessus de 250k€"
                    : t.taux_base > 0
                      ? `${t.taux_base} % (min ${t.prime_min} €/an)`
                      : `forfait ${t.prime_min} €/an`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={calculer}
          className="w-full touch-manipulation rounded-xl bg-blue-600 py-4 font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700"
        >
          Estimer ma prime
        </button>
        {resultat && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5">
            <p className="text-2xl font-bold text-blue-700 tabular-nums min-h-[1.35em]">
              {formatEurosFR(equivMensuelDepuisAnnuel(resultat.prime), {
                minFrac: 0,
                maxFrac: 2,
              })}{" "}
              €/mois <span className="text-lg font-semibold text-slate-800">(équivalent)</span>
            </p>
            <p className="mt-1 text-sm text-slate-700">Soit {resultat.prime.toLocaleString("fr-FR")} €/an — prélèvement trimestriel</p>
            <p className="mt-1 text-sm text-slate-700">Économie estimée : {resultat.economie.toLocaleString("fr-FR")} €/an vs. assureurs traditionnels</p>
            <Link href="/devis" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">
              Obtenir mon devis précis →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
