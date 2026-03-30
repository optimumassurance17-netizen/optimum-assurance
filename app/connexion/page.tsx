"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"

function ConnexionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const callbackUrl = searchParams.get("callbackUrl") || (from === "signature" ? "/signature" : "/espace-client")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email ou mot de passe incorrect")
        setLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Connexion
        </h1>
        <p className="text-[#171717] mb-8">
          {from === "signature"
            ? "Connectez-vous pour accéder à la signature de votre contrat."
            : "Accédez à votre espace client."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-black">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none bg-[#e4e4e4]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block font-medium text-black">Mot de passe</label>
              <Link href="/mot-de-passe-oublie" className="text-sm text-[#2563eb] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className="w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6">
          <Link href="/" className="text-[#2563eb] hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    }>
      <ConnexionForm />
    </Suspense>
  )
}
