"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { readResponseJson } from "@/lib/read-response-json"
import { Toast } from "@/components/Toast"

function prettyQuestionnaireJson(raw: string | null | undefined): string {
  if (!raw?.trim()) return ""
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

interface ClientData {
  user: {
    id: string
    email: string
    raisonSociale: string | null
    siret: string | null
    adresse?: string | null
    codePostal?: string | null
    ville?: string | null
    telephone?: string | null
    createdAt: string
    doInitialQuestionnaireJson?: string | null
    doEtudeQuestionnaireJson?: string | null
  }
  documents: { id: string; type: string; numero: string; status: string; createdAt: string }[]
  payments: { id: string; amount: number; status: string; paidAt: string | null; createdAt: string }[]
  avenantFees: { id: string; amount: number; status: string; createdAt: string }[]
  notes?: { id: string; content: string; adminEmail: string; createdAt: string }[]
  sinistres?: { id: string; dateSinistre: string; montantIndemnisation: number | null; description: string | null; userDocument: { id: string; filename: string; type: string } | null }[]
  userDocuments?: { id: string; type: string; filename: string; size?: number; createdAt?: string }[]
  userDocumentReviews?: Record<
    string,
    { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
  >
}

const typeLabels: Record<string, string> = {
  devis: "Devis",
  devis_do: "Devis DO",
  contrat: "Contrat",
  attestation: "Attestation",
  attestation_nominative: "Attestation nominative",
  attestation_do: "Attestation DO",
  attestation_non_sinistralite: "Attestation non sinistralité",
  avenant: "Avenant",
  facture_do: "Facture acquittée DO",
  facture_decennale: "Facture acquittée décennale",
}

const gedTypeLabels: Record<string, string> = {
  kbis: "KBIS",
  piece_identite: "Pièce d'identité",
  justificatif_activite: "Justificatif d'activité",
  qualification: "Qualification",
  rib: "RIB",
  releve_sinistralite: "Relevé de sinistralité",
  permis_construire: "Permis de construire",
  doc_droc: "DOC / DROC",
  plans_construction: "Plans construction",
  convention_maitrise_oeuvre: "Convention maîtrise d'œuvre",
  convention_controle_technique: "Convention contrôle technique",
  rapport_etude_sol: "Rapport étude de sol",
}

export default function ClientDetailPage() {
  const params = useParams()
  const safeParams = params ?? {}
  const router = useRouter()
  const { status, data: authSession } = useSession()
  const clientId = typeof safeParams.id === "string" ? safeParams.id : ""
  const [data, setData] = useState<ClientData | null>(null)
  const [notes, setNotes] = useState<{ id: string; content: string; adminEmail: string; createdAt: string }[]>([])
  const [noteInput, setNoteInput] = useState("")
  const [noteLoading, setNoteLoading] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailModal, setEmailModal] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [sinistreModal, setSinistreModal] = useState(false)
  const [sinistreLoading, setSinistreLoading] = useState(false)
  const [sinistres, setSinistres] = useState<{
    id: string
    dateSinistre: string
    montantIndemnisation: number | null
    description: string | null
    userDocument: { id: string; filename: string; type: string } | null
  }[]>([])
  const [userDocuments, setUserDocuments] = useState<{ id: string; type: string; filename: string; size?: number; createdAt?: string }[]>([])
  const [userDocumentReviews, setUserDocumentReviews] = useState<
    Record<string, { status: "valid" | "invalid"; reason: string | null; updatedAt: string }>
  >({})
  const [reviewReasonByDocumentId, setReviewReasonByDocumentId] = useState<Record<string, string>>({})
  const [reviewLoadingByDocumentId, setReviewLoadingByDocumentId] = useState<Record<string, boolean>>({})
  const [sinistreForm, setSinistreForm] = useState({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({
    email: "",
    raisonSociale: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    telephone: "",
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [clientAccessLoading, setClientAccessLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    const fetchData = async () => {
      if (!clientId) {
        setError("Client introuvable")
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/gestion/clients/${clientId}`)
        if (res.status === 403) {
          setError("Accès refusé")
          return
        }
        if (!res.ok) throw new Error("Erreur chargement")
        const json = await readResponseJson<ClientData>(res)
        setData(json)
        const u = json.user
        setProfileForm({
          email: u.email,
          raisonSociale: u.raisonSociale ?? "",
          siret: u.siret ?? "",
          adresse: u.adresse ?? "",
          codePostal: u.codePostal ?? "",
          ville: u.ville ?? "",
          telephone: u.telephone ?? "",
        })
        setNotes(json.notes ?? [])
        setSinistres(json.sinistres ?? [])
        setUserDocuments(json.userDocuments ?? [])
        setUserDocumentReviews(json.userDocumentReviews ?? {})
      } catch {
        setError("Client introuvable")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId, status, router])

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement...</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Client introuvable"}</p>
          <Link href="/gestion" className="text-[#2563eb] hover:underline">← Retour au dashboard</Link>
        </div>
      </main>
    )
  }

  const { user, documents, payments, avenantFees } = data
  const caTotal = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0)
  const isOwnAdminAccount = authSession?.user?.id === clientId

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/gestion" className="text-gray-200 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-[#252525] rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <h1 className="text-xl font-semibold text-white">Fiche client</h1>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setClientAccessLoading(true)
                  try {
                    const res = await fetch(`/api/gestion/clients/${clientId}/send-client-access`, {
                      method: "POST",
                    })
                    const json = await readResponseJson<{
                      error?: string
                      ok?: boolean
                      sentTo?: string
                    }>(res)
                    if (!res.ok || !json.ok) {
                      throw new Error(json.error || "Impossible de créer l'accès client.")
                    }
                    setToast({
                      message: `Accès espace client envoyé à ${json.sentTo || user.email}`,
                      type: "success",
                    })
                  } catch (err) {
                    setToast({
                      message: err instanceof Error ? err.message : "Erreur création accès client",
                      type: "error",
                    })
                  } finally {
                    setClientAccessLoading(false)
                  }
                }}
                disabled={clientAccessLoading}
                className="text-sm text-emerald-300 hover:text-emerald-200 font-medium disabled:opacity-50"
              >
                {clientAccessLoading ? "Création accès..." : "Créer / renvoyer accès client"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSinistreForm({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
                  setSinistreModal(true)
                }}
                className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium"
              >
                Sinistre
              </button>
              <button
                type="button"
                onClick={() => setEmailModal(true)}
                className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium"
              >
                Envoyer un email
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-200 mb-4">
            Client depuis le {new Date(user.createdAt).toLocaleDateString("fr-FR")} — modifiez les coordonnées compte
            (connexion, facturation) ci-dessous.
          </p>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setProfileSaving(true)
              try {
                const res = await fetch(`/api/gestion/clients/${clientId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: profileForm.email.trim(),
                    raisonSociale: profileForm.raisonSociale,
                    siret: profileForm.siret,
                    adresse: profileForm.adresse,
                    codePostal: profileForm.codePostal,
                    ville: profileForm.ville,
                    telephone: profileForm.telephone,
                  }),
                })
                const json = await readResponseJson<{
                  error?: string
                  user?: ClientData["user"]
                  syncedDocuments?: number
                }>(res)
                if (!res.ok) throw new Error(json.error || "Erreur")
                if (json.user) {
                  setData((d) => (d ? { ...d, user: json.user! } : d))
                  const n = json.syncedDocuments ?? 0
                  setToast({
                    message:
                      n > 0
                        ? `Fiche enregistrée — identité recopiée sur ${n} contrat(s) / avenant(s)`
                        : "Fiche enregistrée",
                    type: "success",
                  })
                }
              } catch (err) {
                setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
              } finally {
                setProfileSaving(false)
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-200 mb-1">Raison sociale</label>
                <input
                  value={profileForm.raisonSociale}
                  onChange={(e) => setProfileForm((f) => ({ ...f, raisonSociale: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Email (connexion)</label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">SIRET</label>
                <input
                  value={profileForm.siret}
                  onChange={(e) => setProfileForm((f) => ({ ...f, siret: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Téléphone</label>
                <input
                  value={profileForm.telephone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-gray-200 mb-1">Adresse</label>
                <input
                  value={profileForm.adresse}
                  onChange={(e) => setProfileForm((f) => ({ ...f, adresse: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Code postal</label>
                <input
                  value={profileForm.codePostal}
                  onChange={(e) => setProfileForm((f) => ({ ...f, codePostal: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-200 mb-1">Ville</label>
                <input
                  value={profileForm.ville}
                  onChange={(e) => setProfileForm((f) => ({ ...f, ville: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-[#2563eb] text-white px-5 py-2 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 font-medium text-sm"
              >
                {profileSaving ? "Enregistrement…" : "Enregistrer la fiche"}
              </button>
            </div>
          </form>
        </section>

        {(user.doInitialQuestionnaireJson?.trim() || user.doEtudeQuestionnaireJson?.trim()) && (
          <section className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-white">Questionnaires dommage ouvrage</h2>
            <p className="text-xs text-gray-400">
              Données issues du premier devis en ligne et du questionnaire d&apos;étude (espace client). Lecture seule.
            </p>
            {user.doInitialQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#93c5fd] hover:text-[#bfdbfe]">
                  Premier questionnaire (devis en ligne)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.doInitialQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
            {user.doEtudeQuestionnaireJson?.trim() ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#93c5fd] hover:text-[#bfdbfe]">
                  Questionnaire d&apos;étude (espace client)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#1a1a1a] p-3 text-xs text-gray-300 border border-gray-600 whitespace-pre-wrap break-words">
                  {prettyQuestionnaireJson(user.doEtudeQuestionnaireJson)}
                </pre>
              </details>
            ) : null}
          </section>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Documents</p>
            <p className="text-2xl font-bold text-white">{documents.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Paiements</p>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">CA total</p>
            <p className="text-2xl font-bold text-green-400">{caTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-200 text-sm">Frais avenant en attente</p>
            <p className="text-2xl font-bold text-sky-400">{avenantFees.filter((f) => f.status === "pending").length}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {documents.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun document</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">N°</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-4">{typeLabels[d.type] || d.type}</td>
                      <td className="p-4 font-mono">{d.numero}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "suspendu" ? "bg-red-900/50 text-red-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-200"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">
                        <Link
                          href={`/gestion/documents/${d.id}`}
                          className="text-[#2563eb] hover:text-[#1d4ed8] text-sm"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Documents GED déposés par le client</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {userDocuments.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun document GED déposé</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Type GED</th>
                    <th className="text-left p-4 font-medium">Fichier</th>
                    <th className="text-left p-4 font-medium">Date dépôt</th>
                    <th className="text-left p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-700/50">
                      <td className="p-4">{gedTypeLabels[doc.type] || doc.type}</td>
                      <td className="p-4">{doc.filename}</td>
                      <td className="p-4">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={`/api/gestion/clients/${clientId}/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm"
                          >
                            Ouvrir
                          </a>
                          <button
                            type="button"
                            disabled={!!reviewLoadingByDocumentId[doc.id]}
                            onClick={async () => {
                              setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: true }))
                              try {
                                const res = await fetch(
                                  `/api/gestion/clients/${clientId}/documents/${doc.id}/review`,
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "valid" }),
                                  }
                                )
                                const json = await readResponseJson<{
                                  error?: string
                                  review?: { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
                                }>(res)
                                if (!res.ok || !json.review) {
                                  throw new Error(json.error || "Impossible de valider le document.")
                                }
                                setUserDocumentReviews((prev) => ({ ...prev, [doc.id]: json.review! }))
                                setReviewReasonByDocumentId((prev) => ({ ...prev, [doc.id]: "" }))
                                setToast({ message: "Document GED validé", type: "success" })
                              } catch (error) {
                                setToast({
                                  message:
                                    error instanceof Error
                                      ? error.message
                                      : "Impossible de valider le document.",
                                  type: "error",
                                })
                              } finally {
                                setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: false }))
                              }
                            }}
                            className="px-2 py-1 rounded bg-emerald-900/40 text-emerald-200 text-xs hover:bg-emerald-900/60 disabled:opacity-50"
                          >
                            Valide
                          </button>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={reviewReasonByDocumentId[doc.id] ?? userDocumentReviews[doc.id]?.reason ?? ""}
                              onChange={(e) =>
                                setReviewReasonByDocumentId((prev) => ({
                                  ...prev,
                                  [doc.id]: e.target.value,
                                }))
                              }
                              placeholder="Motif refus"
                              className="bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-white w-40"
                            />
                            <button
                              type="button"
                              disabled={!!reviewLoadingByDocumentId[doc.id]}
                              onClick={async () => {
                                const reason = (reviewReasonByDocumentId[doc.id] ?? "").trim()
                                if (!reason) {
                                  setToast({
                                    message: "Le motif est obligatoire pour marquer un document invalide.",
                                    type: "error",
                                  })
                                  return
                                }
                                setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: true }))
                                try {
                                  const res = await fetch(
                                    `/api/gestion/clients/${clientId}/documents/${doc.id}/review`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "invalid", reason }),
                                    }
                                  )
                                  const json = await readResponseJson<{
                                    error?: string
                                    review?: { status: "valid" | "invalid"; reason: string | null; updatedAt: string }
                                  }>(res)
                                  if (!res.ok || !json.review) {
                                    throw new Error(json.error || "Impossible de marquer le document en invalide.")
                                  }
                                  setUserDocumentReviews((prev) => ({ ...prev, [doc.id]: json.review! }))
                                  setToast({ message: "Document GED marqué invalide", type: "success" })
                                } catch (error) {
                                  setToast({
                                    message:
                                      error instanceof Error
                                        ? error.message
                                        : "Impossible de marquer le document en invalide.",
                                    type: "error",
                                  })
                                } finally {
                                  setReviewLoadingByDocumentId((prev) => ({ ...prev, [doc.id]: false }))
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-900/40 text-red-200 text-xs hover:bg-red-900/60 disabled:opacity-50"
                            >
                              Invalide
                            </button>
                          </div>
                          {userDocumentReviews[doc.id] && (
                            <span
                              className={`text-xs ${
                                userDocumentReviews[doc.id].status === "valid"
                                  ? "text-emerald-300"
                                  : "text-red-300"
                              }`}
                            >
                              {userDocumentReviews[doc.id].status === "valid"
                                ? "Validé"
                                : `Invalide${
                                    userDocumentReviews[doc.id].reason
                                      ? `: ${userDocumentReviews[doc.id].reason}`
                                      : ""
                                  }`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Sinistres</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {sinistres.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun sinistre enregistré</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Montant indemnisé</th>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-left p-4 font-medium">Relevé lié</th>
                  </tr>
                </thead>
                <tbody>
                  {sinistres.map((s) => (
                    <tr key={s.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(s.dateSinistre).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">{s.montantIndemnisation != null ? `${s.montantIndemnisation.toLocaleString("fr-FR")} €` : "—"}</td>
                      <td className="p-4">{s.description || "—"}</td>
                      <td className="p-4">{s.userDocument?.filename || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Notes internes</h2>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700 space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!noteInput.trim()) return
                setNoteLoading(true)
                try {
                  const res = await fetch(`/api/gestion/clients/${clientId}/notes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: noteInput }),
                  })
                  if (res.ok) {
                    const note = await readResponseJson<{
                      id: string
                      content: string
                      adminEmail: string
                      createdAt: string
                    }>(res)
                    setNotes((n) => [note, ...n])
                    setNoteInput("")
                  }
                } finally {
                  setNoteLoading(false)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ajouter une note..."
                className="flex-1 bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={noteLoading || !noteInput.trim()}
                className="bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
              >
                {noteLoading ? "..." : "Ajouter"}
              </button>
            </form>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-gray-200 text-sm">Aucune note</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                    <p className="text-white text-sm">{n.content}</p>
                    <p className="text-gray-200 text-xs mt-1">{n.adminEmail} — {new Date(n.createdAt).toLocaleString("fr-FR")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Paiements</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {payments.length === 0 ? (
              <p className="p-4 text-gray-200">Aucun paiement</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Montant</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">{p.amount.toLocaleString("fr-FR")} €</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-sky-200"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="border border-red-900/60 rounded-xl p-6 bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-200 mb-2">Zone sensible</h2>
          <p className="text-sm text-gray-200 mb-4">
            Supprime définitivement le compte, l’accès à l’espace client, les documents décennale / DO, les paiements
            enregistrés, le mandat SEPA en base et les fichiers déposés dans la GED. Les contrats assurance plateforme
            (dossier SaaS) restent conservés sans lien vers ce compte.
          </p>
          {isOwnAdminAccount ? (
            <p className="text-sm text-amber-200">Impossible de supprimer votre propre compte depuis cette fiche.</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmEmail("")
                setDeleteModal(true)
              }}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-red-900/80 text-white hover:bg-red-800 border border-red-700"
            >
              Supprimer la fiche et l’espace client
            </button>
          )}
        </section>
      </div>

      {sinistreModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSinistreModal(false)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Lier un sinistre à un relevé de sinistralité</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!sinistreForm.dateSinistre) return
                setSinistreLoading(true)
                try {
                  const res = await fetch(`/api/gestion/clients/${clientId}/sinistres`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dateSinistre: sinistreForm.dateSinistre,
                      montantIndemnisation: sinistreForm.montantIndemnisation ? Number(sinistreForm.montantIndemnisation) : undefined,
                      description: sinistreForm.description || undefined,
                      userDocumentId: sinistreForm.userDocumentId || undefined,
                    }),
                  })
                  if (res.ok) {
                    const created = await readResponseJson<{
                      id: string
                      dateSinistre: string
                      montantIndemnisation: number | null
                      description: string | null
                      userDocument: { id: string; filename: string; type: string } | null
                    }>(res)
                    setSinistres((prev) => [created, ...prev])
                    setSinistreModal(false)
                    setSinistreForm({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
                  }
                } finally {
                  setSinistreLoading(false)
                }
              }}
              className="space-y-4 mb-6"
            >
              <div>
                <label className="block text-sm text-gray-200 mb-1">Date du sinistre *</label>
                <input
                  type="date"
                  required
                  value={sinistreForm.dateSinistre}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, dateSinistre: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Montant indemnisé (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sinistreForm.montantIndemnisation}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, montantIndemnisation: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Description</label>
                <textarea
                  value={sinistreForm.description}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optionnel"
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Relevé de sinistralité</label>
                <select
                  value={sinistreForm.userDocumentId}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, userDocumentId: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">— Aucun —</option>
                  {userDocuments.filter((d) => d.type === "releve_sinistralite").map((d) => (
                    <option key={d.id} value={d.id}>{d.filename}</option>
                  ))}
                  {userDocuments.filter((d) => d.type === "releve_sinistralite").length === 0 && (
                    <option value="" disabled>Le client n&apos;a pas encore uploadé de relevé</option>
                  )}
                </select>
                <p className="text-xs text-gray-200 mt-1">Le client doit avoir déposé un relevé dans son espace GED</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setSinistreModal(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sinistreLoading || !sinistreForm.dateSinistre}
                  className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {sinistreLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !deleteLoading && setDeleteModal(false)}
        >
          <div
            className="bg-[#252525] border border-red-900/50 rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-red-200 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-200 mb-4">
              Cette action est irréversible. Saisissez l’email du client pour confirmer :{" "}
              <span className="text-white font-mono text-xs break-all">{data.user.email}</span>
            </p>
            <input
              type="email"
              autoComplete="off"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Email du client"
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  deleteLoading ||
                  deleteConfirmEmail.trim().toLowerCase() !== data.user.email.toLowerCase()
                }
                onClick={async () => {
                  setDeleteLoading(true)
                  try {
                    const res = await fetch(`/api/gestion/clients/${clientId}`, {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
                    })
                    const json = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) {
                      setToast({ message: json.error || "Suppression impossible", type: "error" })
                      return
                    }
                    setDeleteModal(false)
                    router.replace("/gestion")
                  } finally {
                    setDeleteLoading(false)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEmailModal(false)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Envoyer un email à {data.user.email}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-200 mb-1">Objet</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Objet de l'email"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-200 mb-1">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Votre message..."
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEmailModal(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!emailSubject.trim() || !emailBody.trim()) return
                  setEmailLoading(true)
                  try {
                    const res = await fetch("/api/gestion/clients/send-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: data.user.id, subject: emailSubject, body: emailBody }),
                    })
                    const json = await readResponseJson<{
                      ok?: boolean
                      sentTo?: string
                      error?: string
                    }>(res)
                    if (res.ok && json.ok) {
                      setEmailModal(false)
                      setEmailSubject("")
                      setEmailBody("")
                      setToast({
                        message: `Email envoyé à ${json.sentTo ?? data.user.email}`,
                        type: "success",
                      })
                    } else {
                      setToast({
                        message: json.error || "Échec de l’envoi",
                        type: "error",
                      })
                    }
                  } finally {
                    setEmailLoading(false)
                  }
                }}
                disabled={emailLoading || !emailSubject.trim() || !emailBody.trim()}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {emailLoading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  )
}
