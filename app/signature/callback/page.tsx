"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"

function SignatureCallbackContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") === "1"
  const status: "success" | "error" = error ? "error" : "success"

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
