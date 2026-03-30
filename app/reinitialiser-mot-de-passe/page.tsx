"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    if (!token) {
      setError("Lien invalide ou expiré")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur")
      setDone(true)
      setTimeout(() => router.push("/connexion"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-md mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Lien invalide ou expiré</h1>
          <p className="text-[#171717] mb-6">Demandez un nouveau lien de réinitialisation.</p>
          <Link href="/mot-de-passe-oublie" className="text-[#2563eb] font-medium hover:underline">
            Mot de passe oublié
          </Link>
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-md mx-auto px-6 py-12 text-center">
          <p className="text-2xl mb-4">✓</p>
          <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Mot de passe modifié</h1>
          <p className="text-[#171717]">Redirection vers la connexion...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-[#0a0a0a]">Nouveau mot de passe</h1>
        <p className="text-[#171717] mb-8">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-[#0a0a0a]">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563eb] outline-none bg-[#e4e4e4]"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-[#0a0a0a]">Confirmer</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563eb] outline-none bg-[#e4e4e4]"
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
            {loading ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-8">
          <Link href="/connexion" className="text-[#2563eb] hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    }>
      <ResetForm />
    </Suspense>
  )
}
