"use client"

import { useState } from "react"
import Link from "next/link"
import { calculerTarif } from "@/lib/tarification"
import { equivMensuelDepuisAnnuel, formatEurosFR } from "@/lib/decennale-affichage-tarif"
import { CA_MINIMUM } from "@/lib/tarification"
import { ACTIVITES_AVEC_TARIFS } from "@/lib/activites-btp"

export function SimulateurPrime() {
  const [chiffreAffaires, setChiffreAffaires] = useState<string>("80000")
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
    <div className="bg-[#f5f5f5] rounded-3xl shadow-xl shadow-black/5 border border-[#d4d4d4] p-8">
      <h2 className="font-bold text-[#171717] mb-6 text-lg">Estimez votre prime en 30 secondes</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#0a0a0a] mb-2">
            Chiffre d&apos;affaires (€)
            <input
              type="number"
              value={chiffreAffaires}
              onChange={(e) => { setResultat(null); setChiffreAffaires(e.target.value) }}
              min={CA_MINIMUM}
              step="10000"
              className="mt-2 block w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none transition-all text-[#0a0a0a] font-medium bg-[#e4e4e4]"
            />
          </label>
          <p className="text-xs text-[#0a0a0a] mt-1.5 italic">
            Les CA sont contrôlés chaque année (greffe, impôts). Bien indiquer le bon chiffre évite les régularisations.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#0a0a0a] mb-2">
            Activité (taux et prime min du PDF)
            <select
              value={activite}
              onChange={(e) => { setResultat(null); setActivite(e.target.value) }}
              className="mt-2 block w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none transition-all text-[#0a0a0a] font-medium bg-[#e4e4e4]"
            >
            {ACTIVITES_AVEC_TARIFS.map((t) => (
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
          className="w-full bg-[#B04F2F] text-white py-4 rounded-xl hover:bg-[#A8482A] font-bold transition-all shadow-md shadow-[#C65D3B]/20"
        >
          Estimer ma prime
        </button>
        {resultat && (
          <div className="p-5 bg-[#FEF3F0] rounded-2xl border border-[#C65D3B]/20">
            <p className="font-bold text-[#C65D3B] text-2xl">
              {formatEurosFR(equivMensuelDepuisAnnuel(resultat.prime), {
                minFrac: 0,
                maxFrac: 2,
              })}{" "}
              €/mois <span className="text-lg font-semibold text-[#171717]">(équivalent)</span>
            </p>
            <p className="text-sm text-[#171717] mt-1">Soit {resultat.prime.toLocaleString("fr-FR")} €/an — prélèvement trimestriel</p>
            <p className="text-sm text-[#171717] mt-1">Économie estimée : {resultat.economie.toLocaleString("fr-FR")} €/an vs. assureurs traditionnels</p>
            <Link href="/devis" className="text-[#C65D3B] font-semibold text-sm mt-3 inline-block hover:underline">
              Obtenir mon devis précis →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
