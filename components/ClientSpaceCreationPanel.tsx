"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { readResponseJson } from "@/lib/read-response-json"

type ClientSpaceCreationPanelProps = {
  email: string
  raisonSociale?: string | null
  siret?: string | null
  telephone?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
  redirectTo?: string
  intro?: string
}

function optionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function ClientSpaceCreationPanel({
  email,
  raisonSociale,
  siret,
  telephone,
  adresse,
  codePostal,
  ville,
  redirectTo = "/espace-client",
  intro,
}: ClientSpaceCreationPanelProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const normalizedEmail = email.trim()
  const loginHref = `/connexion?callbackUrl=${encodeURIComponent(redirectTo)}`
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? ""
  const sameSession =
    status === "authenticated" && sessionEmail.length > 0 && sessionEmail === normalizedEmail.toLowerCase()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          raisonSociale: optionalText(raisonSociale),
          siret: optionalText(siret),
          telephone: optionalText(telephone),
          adresse: optionalText(adresse),
          codePostal: optionalText(codePostal),
          ville: optionalText(ville),
        }),
      })
      const registerJson = await readResponseJson<{ error?: string }>(registerRes)
      if (!registerRes.ok) {
        throw new Error(registerJson.error || "Création de compte impossible")
      }

      const signInResult = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      })
      if (signInResult?.error) {
        throw new Error("Compte créé mais connexion échouée. Connectez-vous avec le mot de passe choisi.")
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">Espace client</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900">Créer votre espace pour suivre le dossier</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {intro ||
          "Le compte reprend l’adresse de la demande. Vous pourrez y déposer les pièces et suivre les échanges."}
      </p>

      {sameSession ? (
        <div className="mt-5">
          <Link
            href={redirectTo}
            className="inline-flex items-center rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Continuer dans mon espace
          </Link>
        </div>
      ) : status === "authenticated" ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Votre session est ouverte avec <strong>{session?.user?.email}</strong>. Pour rattacher cette demande,
          connectez-vous avec <strong>{normalizedEmail}</strong>.
          <div className="mt-3">
            <Link href={loginHref} className="font-semibold text-[#2563eb] hover:underline">
              Se connecter avec le bon compte
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Créer mon espace client</p>
            <p className="mt-1 text-sm text-slate-600">
              Compte associé à <strong>{normalizedEmail}</strong>
            </p>
            <div className="mt-4 grid gap-4">
              <div>
                <label htmlFor="client-space-password" className="mb-1 block text-sm font-medium text-slate-800">
                  Mot de passe
                </label>
                <input
                  id="client-space-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Minimum 8 caractères"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label
                  htmlFor="client-space-password-confirm"
                  className="mb-1 block text-sm font-medium text-slate-800"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="client-space-password-confirm"
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                  autoComplete="new-password"
                />
              </div>
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{error}</p>
                  {error.toLowerCase().includes("existe déjà") ? (
                    <Link href={loginHref} className="mt-2 inline-block font-semibold text-[#2563eb] hover:underline">
                      Se connecter avec ce compte
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Création..." : "Créer mon espace client"}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Déjà client ?</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Connectez-vous pour retrouver vos documents, déposer les pièces et suivre le dossier.
            </p>
            <Link href={loginHref} className="mt-4 inline-flex items-center text-sm font-semibold text-[#2563eb] hover:underline">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
