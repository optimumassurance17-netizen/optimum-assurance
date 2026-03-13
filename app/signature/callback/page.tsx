"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"

function SignatureCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const success = searchParams.get("success") === "1"
    const error = searchParams.get("error") === "1"

    if (error) {
      setStatus("error")
      return
    }

    if (success) {
      setStatus("success")
      return
    }

    setStatus("success")
  }, [searchParams])

  return (
    <main className="min-h-screen bg-[#FDF8F3]">
      <Header />

      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        {status === "loading" && (
          <p className="text-[#171717]">Vérification de votre signature...</p>
        )}

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
            <p className="text-[#171717] mb-8">
              Votre contrat a été signé électroniquement. Passez au paiement pour finaliser votre souscription.
            </p>
            <Link
              href="/paiement"
              className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
            >
              Payer maintenant
            </Link>
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
              className="inline-block bg-[#C65D3B] text-white px-8 py-3 rounded-xl hover:bg-[#B04F2F] transition font-medium"
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
      <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <Header />
        <p className="text-[#171717]">Chargement...</p>
      </main>
    }>
      <SignatureCallbackContent />
    </Suspense>
  )
}
