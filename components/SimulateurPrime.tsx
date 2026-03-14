"use client"

import { useState } from "react"
import Link from "next/link"
import { calculerTarif } from "@/lib/tarification"
import { CA_MINIMUM } from "@/lib/tarification"
import { ACTIVITES_BTP } from "@/lib/activites-btp"

export function SimulateurPrime() {
  const [chiffreAffaires, setChiffreAffaires] = useState<string>("80000")
  const [activite, setActivite] = useState<string>(ACTIVITES_BTP[0])
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
      <h3 className="font-bold text-[#171717] mb-6 text-lg">Estimez votre prime en 30 secondes</h3>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#0a0a0a] mb-2">Chiffre d&apos;affaires (€)</label>
            <input
            type="number"
            value={chiffreAffaires}
            onChange={(e) => { setResultat(null); setChiffreAffaires(e.target.value) }}
            min={CA_MINIMUM}
            step="10000"
            className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none transition-all text-[#0a0a0a] font-medium bg-[#ebebeb]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#0a0a0a] mb-2">Activité</label>
          <select
            value={activite}
            onChange={(e) => { setResultat(null); setActivite(e.target.value) }}
            className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none transition-all text-[#0a0a0a] font-medium bg-[#ebebeb]"
          >
            {ACTIVITES_BTP.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={calculer}
          className="w-full bg-[#C65D3B] text-[#0a0a0a] py-4 rounded-xl hover:bg-[#B04F2F] hover:text-white font-bold transition-all shadow-md shadow-[#C65D3B]/20"
        >
          Estimer ma prime
        </button>
        {resultat && (
          <div className="p-5 bg-[#FEF3F0] rounded-2xl border border-[#C65D3B]/20">
            <p className="font-bold text-[#C65D3B] text-2xl">{resultat.prime.toLocaleString("fr-FR")} €/an</p>
            <p className="text-sm text-[#171717] mt-1">Économie estimée : {resultat.economie.toLocaleString("fr-FR")} € vs. assureurs traditionnels</p>
            <Link href="/devis" className="text-[#C65D3B] font-semibold text-sm mt-3 inline-block hover:underline">
              Obtenir mon devis précis →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
