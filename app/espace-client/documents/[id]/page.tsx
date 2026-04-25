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

type EditableDocumentForm = {
  raisonSociale: string
  siret: string
  adresse: string
  codePostal: string
  ville: string
  telephone: string
  representantLegal: string
  civilite: string
  chiffreAffaires: string
  activitesText: string
}

function toInputString(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function extractActivitiesText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n")
  }
  return toInputString(value)
}

export default function DocumentPage() {
  const params = useParams()
  const routeId = typeof params?.id === "string" ? params.id : ""
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
  const [editMode, setEditMode] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditableDocumentForm>({
    raisonSociale: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    telephone: "",
    representantLegal: "",
    civilite: "",
    chiffreAffaires: "",
    activitesText: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/espace-client")
      return
    }
    if (status !== "authenticated") return

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/${routeId}`)
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
  }, [routeId, status, router])

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
  const canEditDocument = Boolean(document && ["devis", "devis_do", "contrat"].includes(document.type))

  useEffect(() => {
    if (!document) return
    const docData = document.data as Record<string, unknown>
    setEditForm({
      raisonSociale: toInputString(docData.raisonSociale),
      siret: toInputString(docData.siret),
      adresse: toInputString(docData.adresse),
      codePostal: toInputString(docData.codePostal),
      ville: toInputString(docData.ville),
      telephone: toInputString(docData.telephone),
      representantLegal: toInputString(docData.representantLegal),
      civilite: toInputString(docData.civilite),
      chiffreAffaires: toInputString(docData.chiffreAffaires),
      activitesText: extractActivitiesText(docData.activites),
    })
    setEditMode(false)
    setEditError(null)
    setEditSuccess(null)
  }, [document])

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

  const handleSaveEdition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!document || !canEditDocument) return
    setEditSaving(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      const chiffreAffairesRaw = editForm.chiffreAffaires.replace(",", ".").trim()
      const payloadData: Record<string, unknown> = {
        raisonSociale: editForm.raisonSociale.trim(),
        siret: editForm.siret.trim(),
        adresse: editForm.adresse.trim(),
        codePostal: editForm.codePostal.trim(),
        ville: editForm.ville.trim(),
        telephone: editForm.telephone.trim(),
        representantLegal: editForm.representantLegal.trim(),
        civilite: editForm.civilite.trim(),
        activites: editForm.activitesText,
      }
      if (chiffreAffairesRaw !== "") {
        const ca = Number(chiffreAffairesRaw)
        if (!Number.isFinite(ca) || ca < 0) {
          throw new Error("Chiffre d'affaires invalide (nombre >= 0 attendu).")
        }
        payloadData.chiffreAffaires = ca
      }

      const res = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payloadData }),
      })
      const json = await readResponseJson<{ error?: string; data?: Record<string, unknown> }>(res)
      if (!res.ok) {
        throw new Error(json.error || "Impossible d'enregistrer les modifications.")
      }
      const updatedData = json.data || { ...(document.data as Record<string, unknown>), ...payloadData }
      setDocument((prev) => (prev ? { ...prev, data: updatedData } : prev))
      setEditMode(false)
      setEditSuccess("Modifications enregistrées.")
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Impossible d'enregistrer les modifications."
      )
    } finally {
      setEditSaving(false)
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
            {document.type === "attestation_nominative" ? (
              <a
                href={`/api/documents/${document.id}/pdf`}
                className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] font-medium inline-flex items-center"
              >
                Télécharger PDF A4
              </a>
            ) : (
              <button
                onClick={handlePrint}
                className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] font-medium"
              >
                Imprimer / PDF
              </button>
            )}
          </div>
        </div>

        {canEditDocument && (
          <section className="mb-6 print:hidden rounded-2xl border border-[#d4d4d4] bg-[#f5f5f5] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-semibold text-[#0a0a0a]">Modifier le devis / contrat</h2>
              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
                >
                  Modifier
                </button>
              ) : null}
            </div>

            {editSuccess && <p className="mb-3 text-sm text-emerald-700">{editSuccess}</p>}
            {editError && <p className="mb-3 text-sm text-red-700">{editError}</p>}

            {editMode ? (
              <form onSubmit={handleSaveEdition} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.raisonSociale}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, raisonSociale: e.target.value }))}
                    placeholder="Raison sociale"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.siret}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, siret: e.target.value }))}
                    placeholder="SIRET"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.representantLegal}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, representantLegal: e.target.value }))
                    }
                    placeholder="Représentant légal"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.civilite}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, civilite: e.target.value }))}
                    placeholder="Civilité"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.adresse}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Adresse"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.codePostal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, codePostal: e.target.value }))}
                    placeholder="Code postal"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.ville}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, ville: e.target.value }))}
                    placeholder="Ville"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.telephone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, telephone: e.target.value }))}
                    placeholder="Téléphone"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                  />
                  <input
                    value={editForm.chiffreAffaires}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chiffreAffaires: e.target.value }))
                    }
                    placeholder="Chiffre d'affaires"
                    className="rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a] sm:col-span-2"
                  />
                </div>
                <textarea
                  value={editForm.activitesText}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, activitesText: e.target.value }))
                  }
                  rows={4}
                  placeholder="Activités (une par ligne ou séparées par virgule)"
                  className="w-full rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-[#0a0a0a]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                  >
                    {editSaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="rounded-xl border border-[#d4d4d4] px-4 py-2 text-sm text-[#171717]"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-[#171717]">
                Vous pouvez modifier vos informations, activités et chiffre d&apos;affaires pour ce document.
              </p>
            )}
          </section>
        )}

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
          {document.type === "attestation_nominative" && (
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
