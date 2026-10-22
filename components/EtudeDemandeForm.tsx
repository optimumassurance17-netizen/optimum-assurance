"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClientSpaceCreationPanel } from "@/components/ClientSpaceCreationPanel"
import { readResponseJson } from "@/lib/read-response-json"

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

export function EtudeDemandeForm() {
  const [donnees, setDonnees] = useState<DonneesEtude | null>(null)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("optimum-etude")
    if (!stored) return
    try {
      setDonnees(JSON.parse(stored) as DonneesEtude)
    } catch {
      setDonnees(null)
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
      const json = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(json.error || "Erreur")
      setSubmitted(true)
      sessionStorage.removeItem("optimum-etude")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-black text-center mb-4">Demande enregistrée</h2>
        <p className="text-[#171717] text-center mb-8">
          Votre dossier a bien été transmis. Un conseiller vous contactera sous 24 h ouvrées à l’adresse {email}.
          Ce message ne vaut ni tarif, ni attestation.
        </p>
        <ClientSpaceCreationPanel
          email={email}
          raisonSociale={donnees?.raisonSociale}
          siret={donnees?.siret}
          intro="Créez votre espace avec cet e-mail pour recevoir la proposition et déposer le relevé de sinistralité."
        />
      </div>
    )
  }

  if (!donnees) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        <p className="text-[#171717] mb-4">
          Pour une étude liée à la sinistralité, commencez par le devis : les informations déjà saisies seront reprises ici.
        </p>
        <Link
          href="/devis"
          className="inline-block bg-[#2563eb] text-white py-3 px-6 rounded-xl hover:bg-[#1d4ed8] transition font-medium"
        >
          Aller au devis décennale
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-black text-center mb-4">Transmettre le dossier</h2>
      <p className="text-[#171717] text-center mb-6">
        Le nombre de sinistres déclaré sort du parcours automatique. L’équipe étudie le dossier et vous recontacte sous 24 h ouvrées.
      </p>
      <div className="bg-slate-100 rounded-xl p-4 mb-6 text-sm">
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
            className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb] outline-none bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] disabled:bg-gray-400 transition font-medium"
        >
          {submitting ? "Envoi..." : "Transmettre ma demande"}
        </button>
      </form>
    </div>
  )
}
