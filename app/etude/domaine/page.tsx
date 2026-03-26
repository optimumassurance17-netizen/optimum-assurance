"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"

const MIN_DESCRIPTION = 20

export default function EtudeDomainePage() {
  const [email, setEmail] = useState("")
  const [telephone, setTelephone] = useState("")
  const [raisonSociale, setRaisonSociale] = useState("")
  const [siret, setSiret] = useState("")
  const [descriptionActivite, setDescriptionActivite] = useState("")
  const [chiffreAffairesApprox, setChiffreAffairesApprox] = useState("")
  const [commentaire, setCommentaire] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes("@")) {
      setError("Veuillez entrer une adresse email valide.")
      return
    }
    if (descriptionActivite.trim().length < MIN_DESCRIPTION) {
      setError(`Décrivez votre activité ou domaine en au moins ${MIN_DESCRIPTION} caractères pour que nous puissions étudier votre dossier.`)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const caNum = chiffreAffairesApprox.trim() ? Number(chiffreAffairesApprox.replace(/\s/g, "")) : undefined
      const res = await fetch("/api/etude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          raisonSociale: raisonSociale.trim() || undefined,
          siret: siret.replace(/\D/g, "").slice(0, 14) || undefined,
          data: {
            type: "domaine_non_liste",
            descriptionActivite: descriptionActivite.trim(),
            telephone: telephone.trim() || undefined,
            chiffreAffairesApprox: caNum != null && !Number.isNaN(caNum) && caNum > 0 ? caNum : undefined,
            commentaire: commentaire.trim() || undefined,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erreur")
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSubmitting(false)
    }
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
              Notre équipe va étudier la faisabilité de votre assurance décennale pour votre activité. Nous vous recontactons{" "}
              <strong>sous 24 h</strong> à l&apos;adresse <strong>{email}</strong>.
            </p>
            <Link
              href="/"
              className="block w-full bg-[#C65D3B] text-white py-3 rounded-xl hover:bg-[#B04F2F] transition text-center font-medium"
            >
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <nav className="text-sm text-[#333333] mb-6">
          <Link href="/" className="text-[#C65D3B] hover:underline">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/devis" className="text-[#C65D3B] hover:underline">
            Devis décennale
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#0a0a0a]">Activité non listée</span>
        </nav>

        <div className="bg-white border border-[#F0EBE3] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="w-14 h-14 bg-[#F5E8E3] rounded-full flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[#C65D3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-3">Vous ne trouvez pas votre domaine d&apos;activité ?</h1>
          <p className="text-[#171717] mb-6 leading-relaxed">
            Notre liste couvre plus de 100 métiers du BTP, mais chaque situation est unique. Décrivez votre activité : nous vérifions la faisabilité
            d&apos;une assurance décennale et vous proposons une étude personnalisée.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="desc" className="block text-sm font-medium text-black mb-2">
                Décrivez votre activité ou métier <span className="text-[#C65D3B]">*</span>
              </label>
              <textarea
                id="desc"
                value={descriptionActivite}
                onChange={(e) => setDescriptionActivite(e.target.value)}
                rows={5}
                required
                minLength={MIN_DESCRIPTION}
                placeholder="Ex. : installation de panneaux solaires sur toiture, rénovation de monuments historiques, activité mixte gros œuvre / second œuvre…"
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]"
              />
              <p className="text-xs text-[#333333] mt-1">Minimum {MIN_DESCRIPTION} caractères.</p>
            </div>

            <div>
              <label htmlFor="email-domaine" className="block text-sm font-medium text-black mb-2">
                Email professionnel <span className="text-[#C65D3B]">*</span>
              </label>
              <input
                id="email-domaine"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a]"
              />
            </div>

            <div>
              <label htmlFor="tel-domaine" className="block text-sm font-medium text-black mb-2">
                Téléphone <span className="text-[#333333] font-normal">(facultatif)</span>
              </label>
              <input
                id="tel-domaine"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                autoComplete="tel"
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rs-domaine" className="block text-sm font-medium text-black mb-2">
                  Raison sociale <span className="text-[#333333] font-normal">(facultatif)</span>
                </label>
                <input
                  id="rs-domaine"
                  type="text"
                  value={raisonSociale}
                  onChange={(e) => setRaisonSociale(e.target.value)}
                  className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a]"
                />
              </div>
              <div>
                <label htmlFor="siret-domaine" className="block text-sm font-medium text-black mb-2">
                  SIRET <span className="text-[#333333] font-normal">(facultatif)</span>
                </label>
                <input
                  id="siret-domaine"
                  type="text"
                  inputMode="numeric"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))}
                  className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a] font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ca-domaine" className="block text-sm font-medium text-black mb-2">
                Chiffre d&apos;affaires annuel estimé (€) <span className="text-[#333333] font-normal">(facultatif)</span>
              </label>
              <input
                id="ca-domaine"
                type="text"
                inputMode="numeric"
                value={chiffreAffairesApprox}
                onChange={(e) => setChiffreAffairesApprox(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="Ex. 120000"
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a]"
              />
            </div>

            <div>
              <label htmlFor="com-domaine" className="block text-sm font-medium text-black mb-2">
                Précisions <span className="text-[#333333] font-normal">(facultatif)</span>
              </label>
              <textarea
                id="com-domaine"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                placeholder="Contexte du chantier, zone d'intervention, contraintes particulières…"
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none bg-[#e4e4e4] text-[#0a0a0a] placeholder:text-[#404040]"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C65D3B] text-white py-3.5 rounded-xl hover:bg-[#B04F2F] disabled:bg-gray-400 transition font-semibold"
            >
              {submitting ? "Envoi en cours…" : "Envoyer ma demande d&apos;étude"}
            </button>
          </form>

          <p className="text-xs text-[#333333] mt-6 text-center">
            En envoyant ce formulaire, vous acceptez d&apos;être recontacté par Optimum Assurance concernant votre demande.
          </p>

          <Link href="/devis" className="block text-center text-[#C65D3B] text-sm mt-6 font-medium hover:underline">
            ← Retour au devis décennale
          </Link>
        </div>
      </div>
    </main>
  )
}
