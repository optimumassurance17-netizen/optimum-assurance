"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-[#0a0a0a]">
          Mot de passe oublié
        </h1>
        <p className="text-[#171717] mb-8">
          Entrez votre email. Si un compte existe, vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>

        {sent ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="font-medium text-emerald-800 mb-2">Email envoyé</p>
            <p className="text-sm text-emerald-700">
              Si un compte existe pour {email}, vous recevrez un lien par email. Vérifiez vos spams.
            </p>
            <Link href="/connexion" className="inline-block mt-4 text-[#2563eb] font-medium hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-[#0a0a0a]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none bg-[#e4e4e4]"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/connexion" className="text-[#2563eb] hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  )
}
