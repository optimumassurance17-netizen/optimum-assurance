"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"

export default function DevisResumePage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")

  useEffect(() => {
    const token = params.token as string
    if (!token) {
      setStatus("error")
      return
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/devis/draft/${token}`)
        if (!res.ok) {
          setStatus("error")
          return
        }
        const { email, data } = await res.json()
        if (data && typeof window !== "undefined") {
          sessionStorage.setItem("optimum-devis-resume", JSON.stringify({ ...data, email }))
        }
        router.replace("/devis?resume=1")
      } catch {
        setStatus("error")
      }
    }

    load()
  }, [params.token, router])

  if (status === "error") {
    return (
      <main className="min-h-screen bg-[#FDF8F3]">
        <Header />
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          <p className="text-lg text-[#171717] mb-6">Ce lien a expiré ou n&apos;est plus valide.</p>
          <Link href="/devis" className="text-[#C65D3B] font-semibold hover:underline">
            Recommencer un devis
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
      <Header />
      <p className="text-[#171717]">Chargement de votre devis...</p>
    </main>
  )
}
