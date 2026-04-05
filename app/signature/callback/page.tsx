"use client"

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { STORAGE_KEYS } from "@/lib/types"
import { readResponseJson } from "@/lib/read-response-json"

function SignatureCallbackContent() {
  const searchParams = useSearchParams()
  const { status: sessionStatus } = useSession()
  const error = searchParams.get("error") === "1"
  const status: "success" | "error" = error ? "error" : "success"
  const syncOnce = useRef(false)

  /** Secours si webhooks Yousign pas encore actifs : synchronise le contrat via l’API Yousign. */
  useEffect(() => {
    if (status !== "success" || sessionStatus !== "authenticated" || syncOnce.current) return
    if (typeof window === "undefined") return
    const raw = sessionStorage.getItem(STORAGE_KEYS.signature)
    if (!raw) return
    let parsed: { yousignSignatureRequestId?: string }
    try {
      parsed = JSON.parse(raw) as { yousignSignatureRequestId?: string }
    } catch {
      return
    }
    const signatureRequestId = parsed.yousignSignatureRequestId
    if (!signatureRequestId) return
    syncOnce.current = true

    const attemptSync = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch("/api/yousign/sync-pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureRequestId }),
        })
        const data = await readResponseJson<{ result?: string; error?: string }>(res)
        const result = data.result
        if (result === "not_ready" && attempt < 5) {
          await new Promise((r) => setTimeout(r, 2000))
          await attemptSync(attempt + 1)
        }
      } catch {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2000))
          await attemptSync(attempt + 1)
        }
      }
    }

    void attemptSync(0)
  }, [status, sessionStatus])

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-[#2E7D32]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              Signature enregistrée
            </h1>
            <p className="text-[#171717] mb-6">
              Votre contrat a été signé électroniquement. Pour le <strong>mandat SEPA</strong> et le{" "}
              <strong>premier paiement par carte</strong> (Mollie), connectez-vous avec le compte associé à votre dossier
              puis rendez-vous sur la page mandat — ou utilisez le lien direct si vous êtes déjà connecté.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
              <Link
                href={`/connexion?callbackUrl=${encodeURIComponent("/mandat-sepa")}`}
                className="inline-block bg-[#2563eb] text-white px-8 py-3 rounded-xl hover:bg-[#1d4ed8] transition font-medium"
              >
                Connexion → mandat SEPA
              </Link>
              <Link
                href="/mandat-sepa"
                className="inline-block border-2 border-[#2563eb] text-[#2563eb] px-8 py-3 rounded-xl hover:bg-[#dbeafe] transition font-medium"
              >
                Mandat SEPA (déjà connecté)
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-black mb-4">
              Signature non aboutie
            </h1>
            <p className="text-[#171717] mb-8">
              La signature n&apos;a pas pu être finalisée. Vous pouvez réessayer.
            </p>
            <Link
              href="/signature"
              className="inline-block bg-[#2563eb] text-white px-8 py-3 rounded-xl hover:bg-[#1d4ed8] transition font-medium"
            >
              Réessayer
            </Link>
          </>
        )}
      </div>
    </main>
  )
}

export default function SignatureCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Header />
        <p className="text-[#171717]">Chargement...</p>
      </main>
    }>
      <SignatureCallbackContent />
    </Suspense>
  )
}
