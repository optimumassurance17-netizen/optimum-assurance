"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import { STORAGE_KEYS } from "@/lib/types"
import type { SouscriptionData } from "@/lib/types"

export default function CreerComptePage() {
  const router = useRouter()
  const [data, setData] = useState<(SouscriptionData & { signature?: string }) | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored =
      sessionStorage.getItem(STORAGE_KEYS.signature) ||
      sessionStorage.getItem(STORAGE_KEYS.souscription)
    if (!stored) {
      router.replace("/devis")
      return
    }
    try {
      setData(JSON.parse(stored) as SouscriptionData & { signature?: string })
    } catch {
      router.replace("/devis")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    if (!data?.email) return

    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password,
          raisonSociale: data.raisonSociale,
          siret: data.siret,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la création du compte")
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        throw new Error("Compte créé mais connexion échouée")
      }

      // Sauvegarder le devis dans l'espace client (modèle type Optimum)
      if (data.tarif) {
        await fetch("/api/documents/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "devis",
            data: {
              raisonSociale: data.raisonSociale,
              siret: data.siret,
              adresse: data.adresse,
              codePostal: data.codePostal,
              ville: data.ville,
              activites: data.activites,
              chiffreAffaires: data.chiffreAffaires,
              primeAnnuelle: data.tarif.primeAnnuelle,
              primeMensuelle: data.tarif.primeMensuelle,
              primeTrimestrielle: data.tarif.primeTrimestrielle,
              franchise: data.tarif.franchise,
              plafond: data.tarif.plafond,
              dateCreation: new Date().toLocaleDateString("fr-FR"),
              telephone: data.telephone,
              email: data.email,
              representantLegal: data.representantLegal,
              civilite: data.civilite,
              sinistres: data.sinistres,
              jamaisAssure: data.jamaisAssure,
              resilieNonPaiement: data.resilieNonPaiement,
              reprisePasse: data.reprisePasse,
            },
          }),
        })
      }

      router.push("/signature")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Stepper currentStep="compte" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Créer votre espace client
        </h1>
        <p className="text-[#171717] mb-8">
          Choisissez un mot de passe pour accéder à votre espace client et suivre vos documents.
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          <p className="text-sm text-[#171717] mb-2">Compte associé à :</p>
          <p className="font-medium text-black">{data.email}</p>
          <p className="text-sm text-[#171717] mt-1">{data.raisonSociale}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-black">
              Mot de passe *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#e4e4e4]"
              placeholder="Minimum 8 caractères"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border border-[#d4d4d4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C65D3B] focus:border-[#C65D3B] outline-none bg-[#e4e4e4]"
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
            className="w-full bg-[#C65D3B] text-white py-4 rounded-xl hover:bg-[#B04F2F] transition font-medium disabled:bg-[#D4C4BC] disabled:cursor-not-allowed"
          >
            {loading ? "Création en cours..." : "Créer mon espace et continuer"}
          </button>
        </form>

        <p className="text-center text-sm text-[#171717] mt-6 space-x-4">
          <Link href="/souscription" className="text-[#C65D3B] hover:underline">
            Retour à la souscription
          </Link>
          <span>·</span>
          <Link href="/faq#souscription" className="text-[#C65D3B] hover:underline">
            FAQ parcours
          </Link>
        </p>
      </div>
    </main>
  )
}
