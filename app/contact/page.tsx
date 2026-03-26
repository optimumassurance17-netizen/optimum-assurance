"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"

export default function ContactPage() {
  const [nom, setNom] = useState("")
  const [email, setEmail] = useState("")
  const [sujet, setSujet] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, sujet, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur")
      setDone(true)
      setNom("")
      setEmail("")
      setSujet("")
      setMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-2">Nous contacter</h1>
        <p className="text-[#171717] mb-8">
          Une question sur l&apos;assurance décennale ou le dommage ouvrage ? Remplissez le formulaire, nous vous répondrons sous 24h.
        </p>

        {done ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <p className="font-semibold text-emerald-900 mb-2">Message envoyé ✓</p>
            <p className="text-emerald-800 text-sm">
              Nous avons bien reçu votre message et vous répondrons à l&apos;adresse indiquée sous 24h.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-4 text-[#C65D3B] font-medium hover:underline"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nom" className="block text-sm font-semibold text-[#0a0a0a] mb-2">
                Nom / Raison sociale *
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 bg-[#e4e4e4] focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none"
                placeholder="Votre nom ou société"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#0a0a0a] mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 bg-[#e4e4e4] focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label htmlFor="sujet" className="block text-sm font-semibold text-[#0a0a0a] mb-2">
                Sujet
              </label>
              <select
                id="sujet"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 bg-[#e4e4e4] focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none"
              >
                <option value="">Sélectionnez un sujet</option>
                <option value="Devis décennale">Devis décennale</option>
                <option value="Devis dommage ouvrage">Devis dommage ouvrage</option>
                <option value="Sinistre">Déclaration de sinistre</option>
                <option value="Question générale">Question générale</option>
                <option value="Partenariat">Partenariat</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-[#0a0a0a] mb-2">
                Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 bg-[#e4e4e4] focus:ring-2 focus:ring-[#C65D3B]/50 focus:border-[#C65D3B] outline-none resize-none"
                placeholder="Décrivez votre demande..."
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C65D3B] text-white py-4 rounded-2xl hover:bg-[#B04F2F] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Envoi en cours..." : "Envoyer"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/" className="text-[#C65D3B] font-medium hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
