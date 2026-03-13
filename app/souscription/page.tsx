"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { Breadcrumb } from "@/components/Breadcrumb"
import { DevoirConseil } from "@/components/DevoirConseil"
import type { DevisData, SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"

export default function SouscriptionPage() {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisData | null>(null)
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [form, setForm] = useState<Partial<SouscriptionData>>({
    raisonSociale: "",
    adresse: "",
    codePostal: "",
    ville: "",
    email: "",
    telephone: "",
    representantLegal: "",
    civilite: "M",
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem(STORAGE_KEYS.devis)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      const data = JSON.parse(stored) as DevisData
      setDevis(data)
      setForm((f) => ({ ...f, ...data }))
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!devis || !form.email || !form.raisonSociale || !form.representantLegal || !devoirConseilAccepte) return

    // Traçabilité devoir de conseil
    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "souscription", produit: "decennale", email: form.email }),
      })
    } catch {
      /* non bloquant */
    }

    const souscription: SouscriptionData = {
      ...devis,
      raisonSociale: form.raisonSociale!,
      adresse: form.adresse || "",
      codePostal: form.codePostal || "",
      ville: form.ville || "",
      email: form.email!,
      telephone: form.telephone || "",
      representantLegal: form.representantLegal!,
      civilite: (form.civilite as "M" | "Mme" | "Mlle") || "M",
    }
    sessionStorage.setItem(STORAGE_KEYS.souscription, JSON.stringify(souscription))
    router.push("/creer-compte")
  }

  if (!devis) {
    return (
      <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Devis", href: "/devis" }, { label: "Souscription" }]} />
        <Stepper currentStep="souscription" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Souscription
        </h1>
        <p className="text-[#171717] mb-8">
          Complétez vos coordonnées pour finaliser votre assurance décennale.
        </p>

        <div className="bg-[#ebe0db] border border-[#d4c9c4] rounded-xl p-4 mb-8">
          <p className="font-medium text-black">
            Tarif : {devis.tarif?.primeMensuelle} € / mois
          </p>
          <p className="text-sm text-[#171717]">
            Soit {devis.tarif?.primeAnnuelle} € par an
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-black">
              Raison sociale *
            </label>
            <input
              type="text"
              name="raisonSociale"
              value={form.raisonSociale}
              onChange={handleChange}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Adresse
            </label>
            <input
              type="text"
              name="adresse"
              value={form.adresse}
              onChange={handleChange}
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-medium text-black">
                Code postal
              </label>
              <input
                type="text"
                name="codePostal"
                value={form.codePostal}
                onChange={handleChange}
                maxLength={5}
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-black">
                Ville
              </label>
              <input
                type="text"
                name="ville"
                value={form.ville}
                onChange={handleChange}
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
            />
          </div>

          <DevoirConseil
            produit="decennale"
            checkboxId="devoir-conseil-souscription"
            checked={devoirConseilAccepte}
            onCheckedChange={setDevoirConseilAccepte}
            labelCheckbox="J'ai pris connaissance des garanties et exclusions et confirme que ce contrat correspond à ma situation."
          />

          <div>
            <label className="block mb-2 font-medium text-black">
              Représentant légal
            </label>
            <div className="flex gap-3">
              <select
                name="civilite"
                value={form.civilite}
                onChange={handleChange}
                className="border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
              >
                <option value="M">M.</option>
                <option value="Mme">Mme</option>
                <option value="Mlle">Mlle</option>
              </select>
              <input
                type="text"
                name="representantLegal"
                value={form.representantLegal}
                onChange={handleChange}
                placeholder="Nom complet"
                required
                className="flex-1 border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#ebebeb]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!devoirConseilAccepte}
            className="w-full bg-[#C65D3B] text-white py-4 rounded-xl hover:bg-[#B04F2F] transition font-medium disabled:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:hover:bg-[#d4d4d4]"
          >
            Continuer vers la signature
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6 space-x-4">
          <Link href="/devis" className="text-[#C65D3B] hover:underline">
            Modifier mon devis
          </Link>
          <span>·</span>
          <Link href="/faq#souscription" className="text-[#C65D3B] hover:underline">
            FAQ parcours souscription
          </Link>
        </p>
      </div>
    </main>
  )
}
