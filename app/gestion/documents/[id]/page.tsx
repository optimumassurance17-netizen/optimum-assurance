"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { readResponseJson } from "@/lib/read-response-json"
import { Toast } from "@/components/Toast"

const DevisTemplate = dynamic(() => import("@/components/documents/DevisTemplate").then((m) => m.DevisTemplate), { ssr: false })
const DevisDoTemplate = dynamic(() => import("@/components/documents/DevisDoTemplate").then((m) => m.DevisDoTemplate), { ssr: false })
const ContratTemplate = dynamic(() => import("@/components/documents/ContratTemplate").then((m) => m.ContratTemplate), { ssr: false })
const AttestationTemplate = dynamic(() => import("@/components/documents/AttestationTemplate").then((m) => m.AttestationTemplate), { ssr: false })
const AttestationDoTemplate = dynamic(() => import("@/components/documents/AttestationDoTemplate").then((m) => m.AttestationDoTemplate), { ssr: false })
const AttestationNonSinistraliteTemplate = dynamic(() => import("@/components/documents/AttestationNonSinistraliteTemplate").then((m) => m.AttestationNonSinistraliteTemplate), { ssr: false })
const FactureDoTemplate = dynamic(() => import("@/components/documents/FactureDoTemplate").then((m) => m.FactureDoTemplate), { ssr: false })
const FactureDecennaleTemplate = dynamic(
  () => import("@/components/documents/FactureDecennaleTemplate").then((m) => m.FactureDecennaleTemplate),
  { ssr: false }
)
const AvenantTemplate = dynamic(() => import("@/components/documents/AvenantTemplate").then((m) => m.AvenantTemplate), { ssr: false })

export default function GestionDocumentPage() {
  const params = useParams()
  const routeId = typeof params?.id === "string" ? params.id : null
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
  const [signatureSendLoading, setSignatureSendLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return
    if (!routeId) {
      setDocument(null)
      setLoading(false)
      return
    }

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/gestion/documents/${routeId}`)
        const data = await readResponseJson<{
          id: string
          type: string
          numero: string
          data: Record<string, unknown>
          userId: string
          verificationToken?: string | null
        }>(res)
        if (!res.ok) throw new Error("Document introuvable")
        setDocument(data)
      } catch {
        setDocument(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [routeId, status, router])

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
          <Link href="/gestion" className="text-[#2563eb] hover:underline">← Retour au dashboard</Link>
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
          <div className="flex flex-wrap gap-3 items-center justify-end">
            {document.type === "devis" && (
              <button
                type="button"
                disabled={signatureSendLoading}
                onClick={async () => {
                  setSignatureSendLoading(true)
                  setToast(null)
                  try {
                    const res = await fetch("/api/gestion/sign/send-from-devis", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ documentId: document.id }),
                    })
                    const json = await readResponseJson<{
                      error?: string
                      ok?: boolean
                      contractNumero?: string
                    }>(res)
                    if (!res.ok) throw new Error(json.error || "Erreur")
                    setToast({
                      message: `Contrat ${json.contractNumero ?? ""} — lien de signature envoyé à l’email du client.`,
                      type: "success",
                    })
                  } catch (e) {
                    setToast({
                      message: e instanceof Error ? e.message : "Erreur d’envoi",
                      type: "error",
                    })
                  } finally {
                    setSignatureSendLoading(false)
                  }
                }}
                className="text-sm font-medium bg-[#2563eb] text-white px-3 py-1.5 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {signatureSendLoading ? "Envoi…" : "Envoyer pour signature"}
              </button>
            )}
            {(document.type === "contrat" || document.type === "avenant") && (
              <Link
                href={`/gestion?editDoc=${document.id}`}
                className="text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                Modifier les données
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="text-sm text-[#2563eb] hover:text-[#1d4ed8]"
            >
              Imprimer / PDF
            </button>
            <Link href="/gestion" className="text-gray-200 hover:text-white text-sm">Dashboard</Link>
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-4xl mx-auto px-6 pt-4 print:hidden">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

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
          {document.type === "facture_decennale" && (
            <FactureDecennaleTemplate numero={document.numero} data={document.data as never} />
          )}
          {document.type === "avenant" && (
            <AvenantTemplate numero={document.numero} data={document.data as never} />
          )}
        </div>
      </div>
    </main>
  )
}
