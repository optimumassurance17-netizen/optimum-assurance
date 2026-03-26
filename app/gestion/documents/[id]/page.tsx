"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"

const DevisTemplate = dynamic(() => import("@/components/documents/DevisTemplate").then((m) => m.DevisTemplate), { ssr: false })
const DevisDoTemplate = dynamic(() => import("@/components/documents/DevisDoTemplate").then((m) => m.DevisDoTemplate), { ssr: false })
const ContratTemplate = dynamic(() => import("@/components/documents/ContratTemplate").then((m) => m.ContratTemplate), { ssr: false })
const AttestationTemplate = dynamic(() => import("@/components/documents/AttestationTemplate").then((m) => m.AttestationTemplate), { ssr: false })
const AttestationDoTemplate = dynamic(() => import("@/components/documents/AttestationDoTemplate").then((m) => m.AttestationDoTemplate), { ssr: false })
const AttestationNonSinistraliteTemplate = dynamic(() => import("@/components/documents/AttestationNonSinistraliteTemplate").then((m) => m.AttestationNonSinistraliteTemplate), { ssr: false })
const FactureDoTemplate = dynamic(() => import("@/components/documents/FactureDoTemplate").then((m) => m.FactureDoTemplate), { ssr: false })
const AvenantTemplate = dynamic(() => import("@/components/documents/AvenantTemplate").then((m) => m.AvenantTemplate), { ssr: false })

export default function GestionDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [document, setDocument] = useState<{
    id: string
    type: string
    numero: string
    data: Record<string, unknown>
    userId: string
    verificationToken?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/gestion/documents/${params.id}`)
        if (!res.ok) throw new Error("Document introuvable")
        const data = await res.json()
        setDocument(data)
      } catch {
        setDocument(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [params.id, status, router])

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement...</p>
      </main>
    )
  }

  if (!document) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Document introuvable</p>
          <Link href="/gestion" className="text-[#C65D3B] hover:underline">← Retour au dashboard</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href={`/gestion/clients/${document.userId}`} className="text-gray-200 hover:text-white text-sm">
            ← Fiche client
          </Link>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="text-sm text-[#C65D3B] hover:text-[#B04F2F]"
            >
              Imprimer / PDF
            </button>
            <Link href="/gestion" className="text-gray-200 hover:text-white text-sm">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none text-black">
          {document.type === "devis" && (
            <DevisTemplate numero={document.numero} data={document.data as never} />
          )}
          {document.type === "devis_do" && (
            <DevisDoTemplate numero={document.numero} data={document.data as never} />
          )}
          {document.type === "contrat" && (
            <ContratTemplate numero={document.numero} data={document.data as never} />
          )}
          {document.type === "attestation" && (
            <AttestationTemplate
              numero={document.numero}
              verificationUrl={
                document.verificationToken
                  ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/v/${document.verificationToken}`
                  : undefined
              }
              data={document.data as never}
            />
          )}
          {document.type === "attestation_do" && (
            <AttestationDoTemplate
              numero={document.numero}
              verificationUrl={
                document.verificationToken
                  ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/v/${document.verificationToken}`
                  : undefined
              }
              data={document.data as never}
            />
          )}
          {document.type === "attestation_non_sinistralite" && (
            <AttestationNonSinistraliteTemplate
              numero={document.numero}
              data={document.data as never}
            />
          )}
          {document.type === "facture_do" && (
            <FactureDoTemplate numero={document.numero} data={document.data as never} />
          )}
          {document.type === "avenant" && (
            <AvenantTemplate numero={document.numero} data={document.data as never} />
          )}
        </div>
      </div>
    </main>
  )
}
