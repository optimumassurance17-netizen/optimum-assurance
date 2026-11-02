"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createClientAccountAutomatically } from "@/lib/auto-client-account"

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
  const [error, setError] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [phase, setPhase] = useState<"creating" | "created" | "exists" | "error">("creating")
  const [attempt, setAttempt] = useState(0)
  const started = useRef(false)

  const normalizedEmail = email.trim()
  const loginHref = `/connexion?callbackUrl=${encodeURIComponent(redirectTo)}`
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? ""
  const sameSession =
    status === "authenticated" && sessionEmail.length > 0 && sessionEmail === normalizedEmail.toLowerCase()

  useEffect(() => {
    if (status === "loading" || !normalizedEmail) return
    if (sameSession || status === "authenticated") return
    if (started.current) return
    started.current = true

    void createClientAccountAutomatically({
      email: normalizedEmail,
      raisonSociale,
      siret,
      telephone,
      adresse,
      codePostal,
      ville,
    }).then((result) => {
      if (result.ok) {
        setPhase("created")
        if (!result.emailSent && result.temporaryPassword) {
          setTemporaryPassword(result.temporaryPassword)
          return
        }
        router.push(redirectTo)
        router.refresh()
        return
      }
      setError(result.message)
      setPhase(result.reason === "exists" ? "exists" : "error")
    })
  }, [
    adresse,
    codePostal,
    normalizedEmail,
    raisonSociale,
    redirectTo,
    router,
    sameSession,
    siret,
    status,
    telephone,
    ville,
    attempt,
  ])

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">Espace client</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900">Ouverture de votre espace client</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {intro ||
          "Le compte est créé automatiquement avec l’adresse de la demande. Le mot de passe arrive par email."}
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
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-live="polite">
          <p className="text-sm text-slate-600">
            Compte associé à <strong>{normalizedEmail}</strong>
          </p>
          {phase === "creating" ? (
            <p className="mt-3 text-sm font-semibold text-slate-900">Création de votre espace client...</p>
          ) : null}
          {phase === "created" && temporaryPassword ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p>L&apos;email n&apos;est pas parti. Conservez ce mot de passe temporaire :</p>
              <p className="mt-2 font-mono font-semibold">{temporaryPassword}</p>
              <Link
                href={redirectTo}
                className="mt-3 inline-flex rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
              >
                Continuer
              </Link>
            </div>
          ) : null}
          {phase === "created" && !temporaryPassword ? (
            <p className="mt-3 text-sm font-semibold text-slate-900">Espace ouvert. Redirection...</p>
          ) : null}
          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
              {phase === "exists" ? (
                <Link href={loginHref} className="mt-2 inline-block font-semibold text-[#2563eb] hover:underline">
                  Se connecter avec ce compte
                </Link>
              ) : (
                <button
                  type="button"
                  className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                  onClick={() => {
                    started.current = false
                    setAttempt((value) => value + 1)
                  }}
                >
                  Réessayer
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
