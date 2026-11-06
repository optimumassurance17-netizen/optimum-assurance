"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createClientAccountAutomatically } from "@/lib/auto-client-account"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Stepper } from "@/components/Stepper"
import type { DoSouscriptionInsurancePayload, SouscriptionData } from "@/lib/types"
import { STORAGE_KEYS } from "@/lib/types"
import { doPayloadToSouscriptionShim } from "@/lib/build-do-souscription-payload"
import { isDoSouscriptionPayload, runInsuranceContractStepAfterSouscription } from "@/lib/souscription-insurance-contract"
import { readResponseJson } from "@/lib/read-response-json"
import { trackConversion } from "@/lib/conversion-tracking"

export default function CreerComptePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState<
    (SouscriptionData & { signature?: string }) | (DoSouscriptionInsurancePayload & { signature?: string }) | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const autoStarted = useRef(false)
  const continueRef = useRef<
    (payload: (SouscriptionData & { signature?: string }) | (DoSouscriptionInsurancePayload & { signature?: string })) => Promise<void>
  >(async () => {})
  const loggedInRef = useRef<() => Promise<void>>(async () => {})

  const continueAfterAccount = async (
    payload: (SouscriptionData & { signature?: string }) | (DoSouscriptionInsurancePayload & { signature?: string }),
    options?: { trackAccount?: boolean }
  ) => {
    if (options?.trackAccount) {
      trackConversion("account_created", {
        product: isDoSouscriptionPayload(payload) ? "do" : "decennale",
        source: "create-account",
      })
    }

    if (!isDoSouscriptionPayload(payload) && payload.tarif) {
      const devisRes = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "devis",
          data: {
            raisonSociale: payload.raisonSociale,
            siret: payload.siret,
            adresse: payload.adresse,
            codePostal: payload.codePostal,
            ville: payload.ville,
            activites: payload.activites,
            chiffreAffaires: payload.chiffreAffaires,
            primeAnnuelle: payload.tarif.primeAnnuelle,
            primeMensuelle: payload.tarif.primeMensuelle,
            primeTrimestrielle: payload.tarif.primeTrimestrielle,
            franchise: payload.tarif.franchise,
            plafond: payload.tarif.plafond,
            dateCreation: new Date().toLocaleDateString("fr-FR"),
            telephone: payload.telephone,
            email: payload.email,
            representantLegal: payload.representantLegal,
            civilite: payload.civilite,
            sinistres: payload.sinistres,
            jamaisAssure: payload.jamaisAssure,
            resilieNonPaiement: payload.resilieNonPaiement,
            reprisePasse: payload.reprisePasse,
          },
        }),
      })
      if (!devisRes.ok) {
        const devisJson = await readResponseJson<{ error?: string }>(devisRes)
        console.warn("[creer-compte] devis non enregistré", devisJson.error || devisRes.status)
      }
    }

    if (isDoSouscriptionPayload(payload)) {
      sessionStorage.setItem(STORAGE_KEYS.souscription, JSON.stringify(doPayloadToSouscriptionShim(payload)))
    }

    const ins = await runInsuranceContractStepAfterSouscription(
      isDoSouscriptionPayload(payload) ? payload : (payload as SouscriptionData)
    )
    if (ins.outcome === "mollie_redirect") {
      window.location.href = ins.checkoutUrl
      return
    }

    if (isDoSouscriptionPayload(payload)) {
      if (ins.error) {
        setError(ins.error)
        return
      }
      router.push("/espace-client?suite=do")
      return
    }

    router.push("/signature")
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const doRaw = sessionStorage.getItem(STORAGE_KEYS.doSouscription)
    if (doRaw) {
      try {
        const parsed = JSON.parse(doRaw) as DoSouscriptionInsurancePayload
        if (parsed.productType === "do" && parsed.email) {
          sessionStorage.setItem(STORAGE_KEYS.souscription, JSON.stringify(doPayloadToSouscriptionShim(parsed)))
          setData(parsed)
          return
        }
      } catch {
        /* fall through */
      }
    }
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

  const handleContinueLoggedIn = async () => {
    if (!data?.email) return
    setError(null)
    setLoading(true)
    try {
      await continueAfterAccount(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  continueRef.current = continueAfterAccount
  loggedInRef.current = handleContinueLoggedIn

  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? ""
  const sameSession = Boolean(data?.email) && status === "authenticated" && sessionEmail === data!.email.trim().toLowerCase()
  const otherSession = Boolean(data?.email) && status === "authenticated" && !sameSession
  const loginHref = `/connexion?callbackUrl=${encodeURIComponent(
    data && isDoSouscriptionPayload(data) ? "/souscription-dommage-ouvrage" : "/souscription"
  )}`

  useEffect(() => {
    if (!data?.email || status === "loading" || otherSession) return
    if (autoStarted.current) return
    autoStarted.current = true

    if (sameSession) {
      void loggedInRef.current()
      return
    }

    void createClientAccountAutomatically({
      email: data.email,
      raisonSociale: data.raisonSociale,
      siret: data.siret,
      adresse: data.adresse,
      codePostal: data.codePostal,
      ville: data.ville,
      telephone: data.telephone,
    }).then(async (result) => {
      if (!result.ok) {
        setError(result.message)
        setLoading(false)
        return
      }
      if (!result.emailSent && result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword)
        setLoading(false)
        return
      }
      try {
        await continueRef.current(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur")
        setLoading(false)
      }
    })
  }, [data, otherSession, sameSession, status])

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Stepper currentStep="compte" />
        <h1 className="text-3xl font-semibold mb-2 text-black">
          Votre espace client
        </h1>
        <p className="text-[#171717] mb-8">
          Le compte est créé automatiquement. Le mot de passe est envoyé par e-mail, puis le parcours continue.
        </p>

        <div className="bg-[#f5f5f5] border border-[#d4d4d4] rounded-2xl p-6 mb-8">
          <p className="text-sm text-[#171717] mb-2">Compte associé à :</p>
          <p className="font-medium text-black">{data.email}</p>
          <p className="text-sm text-[#171717] mt-1">{data.raisonSociale}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <p>{error}</p>
            {error.toLowerCase().includes("existe déjà") ? (
              <Link href={loginHref} className="mt-2 inline-block font-semibold text-[#2563eb] hover:underline">
                Se connecter pour continuer
              </Link>
            ) : null}
          </div>
        )}

        {sameSession ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm text-emerald-900">
              Vous êtes déjà connecté avec <strong>{data.email}</strong>. Continuez la souscription sans recréer le compte.
            </p>
            <button
              type="button"
              onClick={() => void handleContinueLoggedIn()}
              disabled={loading}
              className="mt-4 w-full bg-[#2563eb] text-white py-4 rounded-xl hover:bg-[#1d4ed8] transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? "Poursuite en cours..." : "Continuer la souscription"}
            </button>
          </div>
        ) : null}

        {otherSession ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Votre session est ouverte avec <strong>{session?.user?.email}</strong>. Le dossier en cours est associé à{" "}
            <strong>{data.email}</strong>.
            <div className="mt-3">
              <Link href={loginHref} className="font-semibold text-[#2563eb] hover:underline">
                Se connecter avec le bon compte
              </Link>
            </div>
          </div>
        ) : null}

        {!sameSession && !otherSession && !error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6" aria-live="polite">
            {temporaryPassword ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p>L&apos;e-mail n&apos;est pas parti. Conservez ce mot de passe temporaire :</p>
                <p className="mt-2 font-mono font-semibold">{temporaryPassword}</p>
                <button
                  type="button"
                  onClick={() => void handleContinueLoggedIn()}
                  disabled={loading}
                  className="mt-4 w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] font-medium disabled:bg-slate-300"
                >
                  {loading ? "Poursuite en cours..." : "Continuer"}
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-900">
                {loading ? "Création de votre espace client..." : "Préparation du compte..."}
              </p>
            )}
          </div>
        ) : null}

        <p className="text-center text-sm text-[#171717] mt-6 space-x-4">
          <Link
            href={data && isDoSouscriptionPayload(data) ? "/souscription-dommage-ouvrage" : "/souscription"}
            className="text-[#2563eb] hover:underline"
          >
            Retour à la souscription
          </Link>
          <span>·</span>
          <Link href="/faq#souscription" className="text-[#2563eb] hover:underline">
            FAQ parcours
          </Link>
        </p>
      </div>
    </main>
  )
}
