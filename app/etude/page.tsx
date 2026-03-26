"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"

interface DonneesEtude {
  siret?: string
  raisonSociale?: string
  chiffreAffaires?: number
  sinistres?: number
  jamaisAssure?: boolean
  activites?: string[]
  montantIndemnisations?: number
  releveSinistraliteNom?: string
}

export default function EtudePage() {
  const [donnees, setDonnees] = useState<DonneesEtude | null>(null)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem("optimum-etude")
    if (stored) {
      try {
        setDonnees(JSON.parse(stored))
      } catch {
        setDonnees(null)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes("@")) {
      setError("Veuillez entrer une adresse email valide.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/etude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          raisonSociale: donnees?.raisonSociale,
          siret: donnees?.siret,
          data: donnees,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erreur")
      setSubmitted(true)
      if (typeof window !== "undefined") sessionStorage.removeItem("optimum-etude")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSubmitting(false)
    }
  }

  if (!donnees && !submitted) {
    return (
      <main className="min-h-screen bg-[#FDF8F3]">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white border border-[#F0EBE3] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-[#171717] mb-4">
              Aucune donnée enregistrée. Pour une étude « sinistres », passez d&apos;abord par le{" "}
              <Link href="/devis" className="text-[#C65D3B] font-medium hover:underline">
                formulaire de devis
              </Link>
              .
            </p>
            <p className="text-[#171717] mb-6 text-sm">
              Votre activité n&apos;est pas dans la liste ?{" "}
              <Link href="/etude/domaine" className="text-[#C65D3B] font-medium hover:underline">
                Demande d&apos;étude pour une activité non listée
              </Link>
              .
            </p>
            <Link href="/devis" className="inline-block bg-[#C65D3B] text-white py-3 px-6 rounded-xl hover:bg-[#B04F2F] transition font-medium">
              Aller au devis décennale
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#FDF8F3]">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white border border-[#F0EBE3] rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-black text-center mb-4">Demande enregistrée</h1>
            <p className="text-[#171717] text-center mb-8">
              Votre dossier a bien été transmis à notre équipe. Un conseiller vous contactera sous 24 h avec une proposition personnalisée à l&apos;adresse {email}.
            </p>
            <Link href="/" className="block w-full bg-[#C65D3B] text-white py-3 rounded-xl hover:bg-[#B04F2F] transition text-center font-medium">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-[#F0EBE3] rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-[#F5E8E3] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#C65D3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-black text-center mb-4">
            Demande d&apos;étude approfondie
          </h1>

          <p className="text-[#171717] text-center mb-6">
            En raison du nombre de sinistres déclarés, notre équipe va étudier votre dossier pour vous proposer une remise personnalisée. Un conseiller vous contactera sous 24 h.
          </p>

          {donnees && (
            <div className="bg-[#F9F6F0] rounded-xl p-4 mb-6 text-sm">
              <p className="font-medium text-black mb-2">Récapitulatif :</p>
              <ul className="text-[#171717] space-y-1">
                <li>SIRET : {donnees.siret || "—"}</li>
                <li>CA annuel : {donnees.chiffreAffaires?.toLocaleString("fr-FR")} €</li>
                <li>Sinistres : {donnees.sinistres}</li>
                <li>Montant indemnisations : {donnees.montantIndemnisations?.toLocaleString("fr-FR") ?? "—"} €</li>
                <li>Relevé sinistralité : {donnees.releveSinistraliteNom || "—"}</li>
                <li>Activités : {donnees.activites?.join(", ") || "—"}</li>
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                Votre email pour recevoir la proposition *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C65D3B] text-white py-3 rounded-xl hover:bg-[#B04F2F] disabled:bg-gray-400 transition font-medium"
            >
              {submitting ? "Envoi..." : "Transmettre ma demande"}
            </button>
          </form>

          <Link href="/" className="block text-center text-[#171717] text-sm mt-6 hover:text-[#C65D3B]">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
