"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface ClientData {
  user: { id: string; email: string; raisonSociale: string | null; siret: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null; telephone?: string | null; createdAt: string }
  documents: { id: string; type: string; numero: string; status: string; createdAt: string }[]
  payments: { id: string; amount: number; status: string; paidAt: string | null; createdAt: string }[]
  avenantFees: { id: string; amount: number; status: string; createdAt: string }[]
  notes?: { id: string; content: string; adminEmail: string; createdAt: string }[]
  sinistres?: { id: string; dateSinistre: string; montantIndemnisation: number | null; description: string | null; userDocument: { id: string; filename: string; type: string } | null }[]
  userDocuments?: { id: string; type: string; filename: string }[]
}

const typeLabels: Record<string, string> = {
  devis: "Devis",
  devis_do: "Devis DO",
  contrat: "Contrat",
  attestation: "Attestation",
  attestation_do: "Attestation DO",
  attestation_non_sinistralite: "Attestation non sinistralité",
  avenant: "Avenant",
  facture_do: "Facture acquittée DO",
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
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
  const [userDocuments, setUserDocuments] = useState<{ id: string; type: string; filename: string }[]>([])
  const [sinistreForm, setSinistreForm] = useState({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/gestion/clients/${params.id}`)
        if (res.status === 403) {
          setError("Accès refusé")
          return
        }
        if (!res.ok) throw new Error("Erreur chargement")
        const json = await res.json()
        setData(json)
        setNotes(json.notes ?? [])
        setSinistres(json.sinistres ?? [])
        setUserDocuments(json.userDocuments ?? [])
      } catch {
        setError("Client introuvable")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, status, router])

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-300">Chargement...</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Client introuvable"}</p>
          <Link href="/gestion" className="text-[#C65D3B] hover:underline">← Retour au dashboard</Link>
        </div>
      </main>
    )
  }

  const { user, documents, payments, avenantFees } = data
  const caTotal = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0)

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/gestion" className="text-gray-300 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-[#252525] rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-semibold text-white">Fiche client</h1>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSinistreForm({ dateSinistre: "", montantIndemnisation: "", description: "", userDocumentId: "" })
                  setSinistreModal(true)
                }}
                className="text-sm text-[#C65D3B] hover:text-[#B04F2F] font-medium"
              >
                Sinistre
              </button>
              <button
                onClick={() => setEmailModal(true)}
                className="text-sm text-[#C65D3B] hover:text-[#B04F2F] font-medium"
              >
                Envoyer un email
              </button>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-400">Raison sociale</dt>
              <dd className="text-white font-medium">{user.raisonSociale || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Email</dt>
              <dd className="text-white">{user.email}</dd>
            </div>
            <div>
              <dt className="text-gray-400">SIRET</dt>
              <dd className="text-white font-mono">{user.siret || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Client depuis</dt>
              <dd className="text-white">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</dd>
            </div>
            {user.adresse && (
              <div className="sm:col-span-2">
                <dt className="text-gray-400">Adresse</dt>
                <dd className="text-white">{[user.adresse, user.codePostal, user.ville].filter(Boolean).join(", ")}</dd>
              </div>
            )}
            {user.telephone && (
              <div>
                <dt className="text-gray-400">Téléphone</dt>
                <dd className="text-white">{user.telephone}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm">Documents</p>
            <p className="text-2xl font-bold text-white">{documents.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm">Paiements</p>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm">CA total</p>
            <p className="text-2xl font-bold text-green-400">{caTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm">Frais avenant en attente</p>
            <p className="text-2xl font-bold text-amber-400">{avenantFees.filter((f) => f.status === "pending").length}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {documents.length === 0 ? (
              <p className="p-4 text-gray-400">Aucun document</p>
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
                          d.status === "resilie" ? "bg-gray-700 text-gray-300" :
                          "bg-amber-900/50 text-amber-300"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4">
                        <Link
                          href={`/gestion/documents/${d.id}`}
                          className="text-[#C65D3B] hover:text-[#B04F2F] text-sm"
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
          <h2 className="text-lg font-semibold text-white mb-4">Sinistres</h2>
          <div className="bg-[#252525] rounded-xl overflow-hidden border border-gray-700">
            {sinistres.length === 0 ? (
              <p className="p-4 text-gray-400">Aucun sinistre enregistré</p>
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
                  const res = await fetch(`/api/gestion/clients/${params.id}/notes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: noteInput }),
                  })
                  if (res.ok) {
                    const note = await res.json()
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
                className="bg-[#C65D3B] text-white px-4 py-2 rounded-lg hover:bg-[#B04F2F] disabled:opacity-50 font-medium"
              >
                {noteLoading ? "..." : "Ajouter"}
              </button>
            </form>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune note</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                    <p className="text-white text-sm">{n.content}</p>
                    <p className="text-gray-500 text-xs mt-1">{n.adminEmail} — {new Date(n.createdAt).toLocaleString("fr-FR")}</p>
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
              <p className="p-4 text-gray-400">Aucun paiement</p>
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
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-green-900/50 text-green-300" : "bg-amber-900/50 text-amber-300"}`}>
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
                  const res = await fetch(`/api/gestion/clients/${params.id}/sinistres`, {
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
                    const created = await res.json()
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
                <label className="block text-sm text-gray-300 mb-1">Date du sinistre *</label>
                <input
                  type="date"
                  required
                  value={sinistreForm.dateSinistre}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, dateSinistre: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Montant indemnisé (€)</label>
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
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  value={sinistreForm.description}
                  onChange={(e) => setSinistreForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optionnel"
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Relevé de sinistralité</label>
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
                <p className="text-xs text-gray-500 mt-1">Le client doit avoir déposé un relevé dans son espace GED</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setSinistreModal(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sinistreLoading || !sinistreForm.dateSinistre}
                  className="px-4 py-2 rounded-lg bg-[#C65D3B] text-white hover:bg-[#B04F2F] disabled:opacity-50"
                >
                  {sinistreLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEmailModal(false)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Envoyer un email à {data.user.email}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Objet</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Objet de l'email"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Message</label>
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
              <button onClick={() => setEmailModal(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
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
                    if (res.ok) {
                      setEmailModal(false)
                      setEmailSubject("")
                      setEmailBody("")
                    }
                  } finally {
                    setEmailLoading(false)
                  }
                }}
                disabled={emailLoading || !emailSubject.trim() || !emailBody.trim()}
                className="px-4 py-2 rounded-lg bg-[#C65D3B] text-white hover:bg-[#B04F2F] disabled:opacity-50"
              >
                {emailLoading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
