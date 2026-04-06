"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Breadcrumb } from "@/components/Breadcrumb"
import { Toast } from "@/components/Toast"
import { DevoirConseil } from "@/components/DevoirConseil"
import { readResponseJson } from "@/lib/read-response-json"

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

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [devoirConseilAccepte, setDevoirConseilAccepte] = useState(false)
  const [document, setDocument] = useState<{
    id: string
    type: string
    numero: string
    status?: string
    data: Record<string, unknown>
    verificationToken?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState(false)
  const [resiliationLoading, setResiliationLoading] = useState(false)
  const [resiliationRequested, setResiliationRequested] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/espace-client")
      return
    }
    if (status !== "authenticated") return

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/${params.id}`)
        const data = await readResponseJson<{
          id: string
          type: string
          numero: string
          status?: string
          data: Record<string, unknown>
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
  }, [params.id, status, router])

  const handlePrint = () => {
    window.print()
  }

  const parseDate = (str: string): Date | null => {
    if (!str || typeof str !== "string") return null
    const parts = str.trim().split(/[/\-.]/)
    if (parts.length !== 3) return null
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }

  const isInResiliationWindow = (dateEffet: Date | null, dateEcheance: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limiteEcheance = new Date(dateEcheance)
    limiteEcheance.setHours(0, 0, 0, 0)
    limiteEcheance.setMonth(limiteEcheance.getMonth() - 2)
    if (today > limiteEcheance) return false
    if (!dateEffet) return false
    const unAnApresEffet = new Date(dateEffet)
    unAnApresEffet.setHours(0, 0, 0, 0)
    unAnApresEffet.setFullYear(unAnApresEffet.getFullYear() + 1)
    return today >= unAnApresEffet
  }

  const data = document?.data as { dateEffet?: string; dateEcheance?: string } | undefined
  const dateEcheance = data?.dateEcheance ? parseDate(data.dateEcheance) : null
  const dateEffet = data?.dateEffet ? parseDate(data.dateEffet) : null
  const canRequestResiliation =
    document &&
    ["contrat", "attestation"].includes(document.type) &&
    ["valide", "suspendu"].includes(document.status || "") &&
    dateEcheance !== null &&
    isInResiliationWindow(dateEffet, dateEcheance)

  const handleRequestResiliation = async () => {
    if (!document || !canRequestResiliation) return
    if (!window.confirm("Confirmer la demande de résiliation ?")) return
    setResiliationLoading(true)
    try {
      const res = await fetch("/api/resiliation/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      })
      const result = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setResiliationRequested(true)
      setToast({ message: "Demande envoyée. Vous serez informé par email.", type: "success" })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
    } finally {
      setResiliationLoading(false)
    }
  }

  const handlePayDevisDo = async () => {
    if (!document || document.type !== "devis_do") return
    setPayLoading(true)
    try {
      await fetch("/api/devoir-conseil/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "paiement_do", produit: "dommage-ouvrage" }),
      })
    } catch {
      /* non bloquant */
    }
    try {
      const res = await fetch(`/api/documents/${document.id}/create-payment`, { method: "POST" })
      const result = await readResponseJson<{
        error?: string
        checkoutUrl?: string
        id?: string
      }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      if (result.checkoutUrl) {
        sessionStorage.setItem("mollie_payment_id", result.id ?? "")
        sessionStorage.setItem("mollie_payment_type", "devis_do")
        sessionStorage.setItem("mollie_payment_document_id", document.id)
        window.location.href = result.checkoutUrl
      } else {
        throw new Error("URL de paiement non reçue")
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur lors du paiement", type: "error" })
    } finally {
      setPayLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[#171717]">Chargement...</p>
      </main>
    )
  }

  if (!document) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <p className="text-[#171717] mb-6">Document introuvable</p>
          <Link href="/espace-client" className="text-[#2563eb] hover:underline">
            Retour à l&apos;espace client
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Espace client", href: "/espace-client" },
            { label: document?.numero || "Document" },
          ]}
        />
        {document.type === "devis_do" && (
          <div className="mb-6 print:hidden space-y-3">
            <p className="text-sm text-[#333333]">
              Règlement : <strong>uniquement virement bancaire</strong> (Mollie). Page sécurisée avec RIB et référence.
              Aucun paiement par carte pour ce devis. Attestation après encaissement du virement.
            </p>
            <DevoirConseil
              produit="dommage-ouvrage"
              checkboxId="devoir-conseil-paiement-do"
              checked={devoirConseilAccepte}
              onCheckedChange={setDevoirConseilAccepte}
              labelCheckbox="Je confirme avoir pris connaissance du devis et des conditions avant de payer."
              compact
            />
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 print:hidden">
          <Link href="/espace-client" className="text-[#2563eb] hover:underline">
            ← Retour
          </Link>
          <div className="flex gap-3">
            {document.type === "devis_do" && (
              <button
                onClick={handlePayDevisDo}
                disabled={payLoading || !devoirConseilAccepte}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:bg-[#d4d4d4] disabled:cursor-not-allowed"
              >
                {payLoading ? "Redirection vers Mollie..." : "Payer par virement (Mollie)"}
              </button>
            )}
            {canRequestResiliation && !resiliationRequested && (
              <button
                onClick={handleRequestResiliation}
                disabled={resiliationLoading}
                className="border border-gray-400 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-100 font-medium disabled:opacity-50"
              >
                {resiliationLoading ? "Envoi..." : "Demander la résiliation"}
              </button>
            )}
            {resiliationRequested && (
              <span className="text-sm font-medium text-blue-700">Demande de résiliation envoyée</span>
            )}
            <button
              onClick={handlePrint}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] font-medium"
            >
              Imprimer / PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none">
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  )
}
