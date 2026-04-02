"use client"

import { useEffect, useState } from "react"

function mapTypeOuvrageToConstruction(typeOuvrage?: string): string {
  const map: Record<string, string> = {
    maison_individuelle: "Maison unifamiliale",
    maison_jumelee: "Maison jumelée",
    immeuble_logements: "Immeuble logements",
    immeuble_logements_commerces: "Immeuble logements",
    immeuble_bureaux: "Immeuble de bureaux",
    etablissement_soins_sportif_culturel: "Établissement de soins, sportif ou culturel",
    batiment_industriel: "Bâtiment industriel",
  }
  return typeOuvrage ? (map[typeOuvrage] ?? "Construction neuve") : ""
}

function mapDestinationConstruction(dest?: string): string {
  const map: Record<string, string> = {
    location: "Location",
    vente: "Vente",
    exploitation_directe: "Exploitation directe",
  }
  return dest ? (map[dest] ?? "Usage personnel") : ""
}
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Toast } from "@/components/Toast"
import { readResponseJson } from "@/lib/read-response-json"

interface DashboardData {
  users: { id: string; email: string; raisonSociale: string | null; siret: string | null; createdAt: string }[]
  devisDoLeads?: { id: string; email: string; data?: string; coutTotal: number | null; createdAt: string }[]
  devisEtudeLeads?: { id: string; email: string; raisonSociale: string | null; siret: string | null; data: string; statut: string; createdAt: string }[]
  documents: {
    id: string
    userId: string
    type: string
    numero: string
    status: string
    data?: string
    createdAt: string
    user: { email: string; raisonSociale: string | null }
  }[]
  payments: {
    id: string
    molliePaymentId: string
    amount: number
    status: string
    paidAt: string | null
    createdAt: string
    user: { email: string; raisonSociale: string | null }
  }[]
  avenantFees?: {
    id: string
    userId: string
    amount: number
    user: { email: string; raisonSociale: string | null }
  }[]
  resiliationLogs?: {
    id: string
    adminEmail: string
    motif: string | null
    createdAt: string
    document: {
      type: string
      numero: string
      user: { email: string; raisonSociale: string | null }
    }
  }[]
  resiliationRequests?: {
    id: string
    motif: string | null
    createdAt: string
    document: {
      id: string
      type: string
      numero: string
      user: { email: string; raisonSociale: string | null }
    }
  }[]
  adminActivityLogs?: {
    id: string
    adminEmail: string
    action: string
    targetType: string | null
    targetId: string | null
    createdAt: string
  }[]
  doStats?: {
    attestationsCount: number
    facturesCount: number
    primesTotal: number
    closCouvertCount: number
    doCompletCount: number
  }
}

export default function GestionPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avenantForm, setAvenantForm] = useState({
    userId: "",
    contractNumero: "",
    chiffreAffaires: "",
    primeAnnuelle: "",
    activites: "",
    motif: "",
  })
  const [devisDoForm, setDevisDoForm] = useState({
    leadId: "",
    userId: "",
    primeAnnuelle: "",
    coutConstruction: "",
    telephone: "",
    adresseOperation: "",
    typeConstruction: "",
    destination: "",
    closCouvert: "",
    fraisGestion: "",
    fraisCourtage: "",
  })
  const [avenantSubmitting, setAvenantSubmitting] = useState(false)
  const [devisDoSubmitting, setDevisDoSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all")
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)
  const [resiliationModal, setResiliationModal] = useState<{ docId: string; motif: string } | null>(null)
  const [editModal, setEditModal] = useState<{
    docId: string
    type: "contrat" | "avenant"
    numero: string
    form: { chiffreAffaires: string; primeAnnuelle: string; activites: string; motifAvenant: string; dateEffet: string; dateEcheance: string }
  } | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [etudeMiseModal, setEtudeMiseModal] = useState<{
    id: string
    email: string
    raisonSociale: string | null
    primeAnnuelle: string
  } | null>(null)
  const [etudeMiseSubmitting, setEtudeMiseSubmitting] = useState(false)

  const openEditModal = (doc: { id: string; type: string; numero: string; data?: string }) => {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(doc.data || "{}") as Record<string, unknown>
    } catch {
      /* ignore */
    }
    setEditModal({
      docId: doc.id,
      type: doc.type as "contrat" | "avenant",
      numero: doc.numero,
      form: {
        chiffreAffaires: String(parsed.chiffreAffaires ?? ""),
        primeAnnuelle: String(parsed.primeAnnuelle ?? ""),
        activites: Array.isArray(parsed.activites) ? (parsed.activites as string[]).join(", ") : String(parsed.activites ?? ""),
        motifAvenant: String(parsed.motifAvenant ?? ""),
        dateEffet: String(parsed.dateEffet ?? ""),
        dateEcheance: String(parsed.dateEcheance ?? ""),
      },
    })
  }
  const handleSaveEdit = async () => {
    if (!editModal) return
    setEditSubmitting(true)
    try {
      const modifications: Record<string, unknown> = {}
      if (editModal.form.chiffreAffaires) modifications.chiffreAffaires = Number(editModal.form.chiffreAffaires)
      if (editModal.form.primeAnnuelle) modifications.primeAnnuelle = Number(editModal.form.primeAnnuelle)
      if (editModal.form.activites) modifications.activites = editModal.form.activites.split(",").map((a) => a.trim()).filter(Boolean)
      if (editModal.form.motifAvenant) modifications.motifAvenant = editModal.form.motifAvenant
      if (editModal.form.dateEffet) modifications.dateEffet = editModal.form.dateEffet
      if (editModal.form.dateEcheance) modifications.dateEcheance = editModal.form.dateEcheance

      const res = await fetch(`/api/gestion/documents/${editModal.docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: modifications }),
      })
      const patchBody = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(patchBody.error || "Erreur")
      setEditModal(null)
      setToast({ message: "Modification enregistrée", type: "success" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
    } finally {
      setEditSubmitting(false)
    }
  }

  const filterBySearch = <T extends { user: { email: string; raisonSociale: string | null } }>(
    items: T[],
    q: string
  ): T[] => {
    if (!q.trim()) return items
    const lower = q.toLowerCase()
    return items.filter(
      (i) =>
        i.user.email?.toLowerCase().includes(lower) ||
        i.user.raisonSociale?.toLowerCase().includes(lower)
    )
  }
  const filterUsersBySearch = <T extends { email: string; raisonSociale: string | null }>(
    items: T[],
    q: string
  ): T[] => {
    if (!q.trim()) return items
    const lower = q.toLowerCase()
    return items.filter(
      (i) => i.email?.toLowerCase().includes(lower) || i.raisonSociale?.toLowerCase().includes(lower)
    )
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion")
      return
    }
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const res = await fetch("/api/gestion/dashboard")
        if (res.status === 403) {
          setError("Accès refusé")
          return
        }
        if (!res.ok) throw new Error("Erreur chargement")
        const json = await readResponseJson<DashboardData>(res)
        setData(json)
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status, router])

  const handleStatusChange = async (docId: string, newStatus: "valide" | "suspendu" | "resilie", motif?: string) => {
    try {
      const res = await fetch(`/api/gestion/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, motif: motif || undefined }),
      })
      if (!res.ok) throw new Error()
      if (data) {
        setData({
          ...data,
          documents: data.documents.map((d) =>
            d.id === docId ? { ...d, status: newStatus } : d
          ),
        })
      }
      setResiliationModal(null)
      setToast({ message: newStatus === "resilie" ? "Résiliation enregistrée. Email envoyé au client." : "Statut mis à jour", type: "success" })
    } catch {
      setToast({ message: "Erreur lors de la mise à jour", type: "error" })
    }
  }


  const handleCreateDevisDo = async (e: React.FormEvent) => {
    e.preventDefault()
    setDevisDoSubmitting(true)
    try {
      const selectedUser = data?.users.find((u) => u.id === devisDoForm.userId)
      const res = await fetch("/api/gestion/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: devisDoForm.userId,
          type: "devis_do",
          data: (() => {
            const cout = Number(devisDoForm.coutConstruction) || 0
            const tarif = cout > 0 ? calculerTarifDommageOuvrage(cout) : null
            return {
              raisonSociale: selectedUser?.raisonSociale || undefined,
              email: selectedUser?.email || undefined,
              primeAnnuelle: Number(devisDoForm.primeAnnuelle),
              coutConstruction: cout || undefined,
              tranche: tarif?.tranche,
              produit: "dommage_ouvrage",
              telephone: devisDoForm.telephone || undefined,
              adresseOperation: devisDoForm.adresseOperation || undefined,
              typeConstruction: devisDoForm.typeConstruction || undefined,
              destination: devisDoForm.destination || undefined,
              closCouvert: devisDoForm.closCouvert === "oui" ? true : devisDoForm.closCouvert === "non" ? false : undefined,
              fraisGestion: Number(devisDoForm.fraisGestion) || undefined,
              fraisCourtage: Number(devisDoForm.fraisCourtage) || undefined,
              dateCreation: new Date().toLocaleDateString("fr-FR"),
            }
          })(),
        }),
      })
      const result = await readResponseJson<{ error?: string; numero?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setToast({ message: `Devis DO ${result.numero} créé. Email envoyé au client.`, type: "success" })
      setDevisDoForm({ leadId: "", userId: "", primeAnnuelle: "", coutConstruction: "", telephone: "", adresseOperation: "", typeConstruction: "", destination: "", closCouvert: "", fraisGestion: "", fraisCourtage: "" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur création devis DO", type: "error" })
    } finally {
      setDevisDoSubmitting(false)
    }
  }

  const handleCreateAvenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setAvenantSubmitting(true)
    try {
      const modifications: Record<string, unknown> = {}
      if (avenantForm.chiffreAffaires) modifications.chiffreAffaires = Number(avenantForm.chiffreAffaires)
      if (avenantForm.primeAnnuelle) modifications.primeAnnuelle = Number(avenantForm.primeAnnuelle)
      if (avenantForm.activites) modifications.activites = avenantForm.activites.split(",").map((a) => a.trim()).filter(Boolean)

      const res = await fetch("/api/gestion/avenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: avenantForm.userId,
          contractNumero: avenantForm.contractNumero,
          modifications,
          motif: avenantForm.motif || undefined,
        }),
      })
      const result = await readResponseJson<{ error?: string; numero?: string }>(res)
      if (!res.ok) throw new Error(result.error || "Erreur")
      setToast({ message: `Avenant ${result.numero} créé`, type: "success" })
      setAvenantForm({ userId: "", contractNumero: "", chiffreAffaires: "", primeAnnuelle: "", activites: "", motif: "" })
      const dashRes = await fetch("/api/gestion/dashboard")
      if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Erreur création avenant", type: "error" })
    } finally {
      setAvenantSubmitting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-[#2563eb] hover:underline">Retour</Link>
        </div>
      </main>
    )
  }

  if (!data) return null

  const attestations = data.documents.filter((d) => {
    if (docTypeFilter === "attestation") return d.type === "attestation"
    if (docTypeFilter === "attestation_do") return d.type === "attestation_do"
    return d.type === "attestation" || d.type === "attestation_do"
  })
  const contrats = data.documents.filter((d) => d.type === "contrat")

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Gestion CRM</h1>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (!data) return
                const csv = [
                  ["Type", "Client", "Montant", "Statut", "Date"].join(";"),
                  ...data.payments.map((p) =>
                    ["Paiement", p.user.raisonSociale || p.user.email, p.amount, p.status, new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")].join(";")
                  ),
                ].join("\n")
                const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `export-paiements-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-gray-200 hover:text-white"
            >
              Export paiements
            </button>
            {data.devisDoLeads && data.devisDoLeads.length > 0 && (
              <button
                onClick={() => {
                  if (!data?.devisDoLeads) return
                  const csv = [
                    ["Email", "Coût construction (€)", "Date"].join(";"),
                    ...data.devisDoLeads.map((d) =>
                      [d.email, d.coutTotal ?? "", new Date(d.createdAt).toLocaleDateString("fr-FR")].join(";")
                    ),
                  ].join("\n")
                  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `export-devis-do-${new Date().toISOString().slice(0, 10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-sm text-gray-200 hover:text-white"
              >
                Export devis DO
              </button>
            )}
            <Link href="/" className="text-sm text-gray-200 hover:text-white">← Retour site</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {data && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <input
                type="search"
                placeholder="Rechercher un client (email, raison sociale)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#252525] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 w-full sm:w-80"
              />
            </div>
            <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Clients</p>
                <Link href="#clients" className="text-2xl font-bold text-white hover:text-[#2563eb] block">
                  {filterUsersBySearch(data.users, searchQuery).length}
                </Link>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Paiements</p>
                <p className="text-2xl font-bold text-white">{filterBySearch(data.payments, searchQuery).length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">CA (paiements)</p>
                <p className="text-2xl font-bold text-green-400">{filterBySearch(data.payments, searchQuery).filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0).toLocaleString("fr-FR")} €</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Attestations suspendues</p>
                <p className="text-2xl font-bold text-red-400">{filterBySearch(data.documents.filter((d) => d.type === "attestation"), searchQuery).filter((d) => d.status === "suspendu").length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Résiliés</p>
                <p className="text-2xl font-bold text-gray-200">{filterBySearch(data.documents.filter((d) => d.type === "attestation" || d.type === "contrat"), searchQuery).filter((d) => d.status === "resilie").length}</p>
              </div>
              <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                <p className="text-gray-200 text-sm">Frais avenant en attente</p>
                <p className="text-2xl font-bold text-sky-400">{data.avenantFees?.length ?? 0}</p>
                <p className="text-xs text-gray-200 mt-1">{(data.avenantFees?.reduce((a, f) => a + f.amount, 0) ?? 0).toLocaleString("fr-FR")} € à reporter</p>
              </div>
              {(data.devisEtudeLeads?.length ?? 0) > 0 && (
                <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-200 text-sm">Demandes d&apos;étude</p>
                  <p className="text-2xl font-bold text-[#2563eb]">{data.devisEtudeLeads?.length ?? 0}</p>
                  <p className="text-xs text-gray-200 mt-1">À traiter (remise personnalisée)</p>
                </div>
              )}
              {data.doStats && (
                <>
                  <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                    <p className="text-gray-200 text-sm">Attestations DO</p>
                    <p className="text-2xl font-bold text-white">{data.doStats.attestationsCount}</p>
                    <p className="text-xs text-gray-200 mt-1">Clos/couv. {data.doStats.closCouvertCount} — DO complète {data.doStats.doCompletCount}</p>
                  </div>
                  <div className="bg-[#252525] rounded-xl p-4 border border-gray-700">
                    <p className="text-gray-200 text-sm">CA DO (primes)</p>
                    <p className="text-2xl font-bold text-emerald-400">{data.doStats.primesTotal.toLocaleString("fr-FR")} €</p>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* Liste clients - accès fiche détaillée */}
        {data && (
          <section id="clients">
            <h2 className="text-lg font-semibold text-white mb-4">Clients</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">SIRET</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterUsersBySearch(data.users, searchQuery).length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-gray-200">Aucun client</td></tr>
                  ) : (
                    filterUsersBySearch(data.users, searchQuery).map((u) => (
                      <tr key={u.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">{u.raisonSociale || "—"}</td>
                        <td className="p-3 sm:p-4">{u.email}</td>
                        <td className="p-3 sm:p-4 font-mono text-gray-200 hidden sm:table-cell">{u.siret || "—"}</td>
                        <td className="p-3 sm:p-4">
                          <Link
                            href={`/gestion/clients/${u.id}`}
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                          >
                            Fiche client →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data?.resiliationRequests && data.resiliationRequests.length > 0 && (
          <div className="p-4 bg-blue-950/40 border border-blue-600 rounded-xl">
            <p className="font-medium text-sky-300">Demandes de résiliation en attente</p>
            <div className="mt-3 space-y-2">
              {data.resiliationRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-[#252525] rounded-lg p-3 border border-blue-600/50">
                  <div>
                    <span className="font-mono text-white">{r.document.numero}</span>
                    <span className="text-gray-200 ml-2">— {r.document.user.raisonSociale || r.document.user.email}</span>
                    {r.motif && <span className="block text-sm text-gray-200 mt-1">Motif : {r.motif}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/gestion/resiliation-requests/${r.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "approve" }),
                          })
                          if (!res.ok) throw new Error()
                          setToast({ message: "Résiliation autorisée. Email envoyé au client.", type: "success" })
                          const dashRes = await fetch("/api/gestion/dashboard")
                          if (dashRes.ok) setData(await dashRes.json())
                        } catch {
                          setToast({ message: "Erreur", type: "error" })
                        }
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-green-900/50 text-green-300 hover:bg-green-900/70"
                    >
                      Autoriser
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/gestion/resiliation-requests/${r.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "reject" }),
                          })
                          if (!res.ok) throw new Error()
                          setToast({ message: "Demande refusée", type: "success" })
                          const dashRes = await fetch("/api/gestion/dashboard")
                          if (dashRes.ok) setData(await dashRes.json())
                        } catch {
                          setToast({ message: "Erreur", type: "error" })
                        }
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-red-900/50 text-red-300 hover:bg-red-900/70"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {data && data.documents.some((d) => d.type === "attestation" && d.status === "suspendu") && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
            <p className="font-medium text-red-300">⚠ Alertes impayés</p>
            <p className="text-sm text-red-200 mt-1">
              {data.documents.filter((d) => d.type === "attestation" && d.status === "suspendu").length} attestation(s) suspendue(s). Pensez à relancer les clients pour régularisation.
            </p>
          </div>
        )}
        {data && (data.avenantFees?.length ?? 0) > 0 && (
          <div className="p-4 bg-blue-950/40 border border-blue-600 rounded-xl">
            <p className="font-medium text-sky-300">Frais d&apos;avenant en attente</p>
            <p className="text-sm text-sky-200 mt-1">
              {(data.avenantFees?.length ?? 0)} frais à reporter sur le prochain prélèvement ({(data.avenantFees?.reduce((a, f) => a + f.amount, 0) ?? 0).toLocaleString("fr-FR")} € total).
            </p>
            <p className="text-xs text-sky-200/80 mt-2">
              Clients : {data.avenantFees?.map((f) => f.user.raisonSociale || f.user.email).join(", ")}
            </p>
          </div>
        )}
        {/* Paiements */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Paiements</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Montant</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">Mollie ID</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(data.payments, searchQuery).length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-gray-200">Aucun paiement</td></tr>
                ) : (
                  filterBySearch(data.payments, searchQuery).map((p) => (
                    <tr key={p.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4">{new Date(p.paidAt || p.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">{p.user.raisonSociale || p.user.email}</td>
                      <td className="p-3 sm:p-4">{p.amount.toLocaleString("fr-FR")} €</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${p.status === "paid" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-sky-300"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 font-mono text-xs text-gray-200 hidden md:table-cell">{p.molliePaymentId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Attestations et suspension */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Attestations</h2>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">Toutes (décennale + DO)</option>
              <option value="attestation">Décennale uniquement</option>
              <option value="attestation_do">DO uniquement</option>
            </select>
          </div>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">Type</th>
                  <th className="text-left p-3 sm:p-4 font-medium">N°</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(attestations, searchQuery).length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-gray-200">Aucune attestation</td></tr>
                ) : (
                  filterBySearch(attestations, searchQuery).map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4">
                        <span className="text-xs text-gray-200">{d.type === "attestation_do" ? "DO" : "Décennale"}</span>
                      </td>
                      <td className="p-3 sm:p-4 font-mono">{d.numero}</td>
                      <td className="p-3 sm:p-4">{d.user.raisonSociale || d.user.email}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "suspendu" ? "bg-red-900/50 text-red-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-300"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">
                        <Link href={`/gestion/documents/${d.id}`} className="text-[#2563eb] hover:text-[#1d4ed8] text-sm mr-2">
                          Voir
                        </Link>
                        {d.type === "attestation" && d.status === "valide" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(d.id, "suspendu")}
                              className="text-red-400 hover:text-red-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Suspendre
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Résilier
                            </button>
                          </>
                        )}
                        {d.type === "attestation" && d.status === "suspendu" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(d.id, "valide")}
                              className="text-green-400 hover:text-green-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Restaurer
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Résilier
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contrats - autorisation annulation */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Contrats</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 sm:p-4 font-medium">N°</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(contrats, searchQuery).length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-gray-200">Aucun contrat</td></tr>
                ) : (
                  filterBySearch(contrats, searchQuery).map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50">
                      <td className="p-3 sm:p-4 font-mono">{d.numero}</td>
                      <td className="p-3 sm:p-4">{d.user.raisonSociale || d.user.email}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          d.status === "valide" ? "bg-green-900/50 text-green-300" :
                          d.status === "resilie" ? "bg-gray-700 text-gray-200" :
                          "bg-blue-900/50 text-sky-300"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 sm:p-4">
                        {d.status === "valide" && (
                          <>
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-sky-400 hover:text-sky-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => setResiliationModal({ docId: d.id, motif: "" })}
                              className="text-gray-200 hover:text-white text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2 ml-2"
                            >
                              Autoriser annulation
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demandes d'étude approfondie - remise personnalisée */}
        {data?.devisEtudeLeads && data.devisEtudeLeads.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Demandes d&apos;étude (remise personnalisée)</h2>
            <p className="text-sm text-gray-200 mb-4">
              Dossiers sinistres (&gt;1 sinistre) ou <strong className="text-gray-200">activité non listée</strong> (/etude/domaine). Faire une remise pour envoyer une proposition avec prime personnalisée.
            </p>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0 mb-10">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Raison sociale</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">SIRET</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisEtudeLeads.map((lead) => {
                    let parsed: {
                      type?: string
                      chiffreAffaires?: number
                      sinistres?: number
                      activites?: string[]
                      descriptionActivite?: string
                      chiffreAffairesApprox?: number
                    } = {}
                    try {
                      parsed = JSON.parse(lead.data) as typeof parsed
                    } catch {
                      /* ignore */
                    }
                    const estDomaine = parsed.type === "domaine_non_liste"
                    const resume = estDomaine
                      ? (parsed.descriptionActivite ?? "").slice(0, 80) + ((parsed.descriptionActivite?.length ?? 0) > 80 ? "…" : "")
                      : `CA ${parsed.chiffreAffaires?.toLocaleString("fr-FR") ?? "—"} € · ${parsed.sinistres ?? 0} sinistre(s)`
                    return (
                      <tr key={lead.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">
                          {lead.email}
                          {estDomaine && (
                            <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-blue-900/50 text-sky-200 px-1.5 py-0.5 rounded">
                              Domaine
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">{lead.raisonSociale || "—"}</td>
                        <td className="p-3 sm:p-4 font-mono text-gray-200 hidden sm:table-cell">{lead.siret || "—"}</td>
                        <td className="p-3 sm:p-4">{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">
                          <button
                            onClick={() => setEtudeMiseModal({
                              id: lead.id,
                              email: lead.email,
                              raisonSociale: lead.raisonSociale,
                              primeAnnuelle: "",
                            })}
                            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                          >
                            Faire une remise
                          </button>
                          <span className="text-gray-200 text-xs ml-2 block sm:inline mt-1 sm:mt-0" title={estDomaine ? parsed.descriptionActivite : undefined}>
                            {resume}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Devis dommage ouvrage - ajout manuel */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Ajouter un devis dommage ouvrage</h2>
          <p className="text-sm text-gray-200 mb-4">
            Le devis sera ajouté à l&apos;espace client. Le client pourra signer électroniquement (Yousign) et payer par virement bancaire (Mollie).
          </p>
          <form onSubmit={handleCreateDevisDo} className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 max-w-xl mb-10">
            {data.devisDoLeads && data.devisDoLeads.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Préremplir depuis une demande</label>
                <select
                  value={devisDoForm.leadId}
                  onChange={(e) => {
                    const leadId = e.target.value
                    setDevisDoForm((f) => {
                      const next = { ...f, leadId }
                      if (!leadId) return next
                      const lead = data.devisDoLeads?.find((l) => l.id === leadId)
                      if (!lead) return next
                      const matchingUser = data.users.find((u) => u.email.toLowerCase() === lead.email.toLowerCase())
                      const tarif = lead.coutTotal && lead.coutTotal > 0 ? calculerTarifDommageOuvrage(lead.coutTotal) : null
                      let adresseOp = ""
                      let tel = ""
                      let typeConstruction = ""
                      let destination = ""
                      let closCouvert = ""
                      try {
                        const leadData = JSON.parse(lead.data || "{}") as {
                          adresseConstruction?: string
                          codePostalConstruction?: string
                          villeConstruction?: string
                          telephone?: string
                          typeOuvrage?: string
                          destinationConstruction?: string
                          operationClosCouvert?: boolean
                        }
                        adresseOp = [leadData.adresseConstruction, leadData.codePostalConstruction, leadData.villeConstruction].filter(Boolean).join(" ") || ""
                        tel = leadData.telephone || ""
                        typeConstruction = mapTypeOuvrageToConstruction(leadData.typeOuvrage)
                        destination = mapDestinationConstruction(leadData.destinationConstruction)
                        closCouvert = leadData.operationClosCouvert === true ? "oui" : leadData.operationClosCouvert === false ? "non" : ""
                      } catch {
                        /* ignore */
                      }
                      return {
                        ...next,
                        userId: matchingUser?.id ?? "",
                        coutConstruction: lead.coutTotal ? String(lead.coutTotal) : "",
                        primeAnnuelle: tarif ? String(tarif.primeAnnuelle) : f.primeAnnuelle,
                        adresseOperation: adresseOp || f.adresseOperation,
                        telephone: tel || f.telephone,
                        typeConstruction: typeConstruction || f.typeConstruction,
                        destination: destination || f.destination,
                        closCouvert: closCouvert || f.closCouvert,
                      }
                    })
                  }}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">— Aucune —</option>
                  {data.devisDoLeads.map((l) => {
                    const match = data.users.find((u) => u.email.toLowerCase() === l.email.toLowerCase())
                    return (
                      <option key={l.id} value={l.id}>
                        {l.email} — {l.coutTotal ? `${l.coutTotal.toLocaleString("fr-FR")} €` : "—"} {match ? "✓" : ""}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Client (doit avoir un compte)</label>
              <select
                value={devisDoForm.userId}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {filterUsersBySearch(data.users, searchQuery).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.raisonSociale || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Prime annuelle (€)</label>
                <input
                  type="number"
                  value={devisDoForm.primeAnnuelle}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, primeAnnuelle: e.target.value }))}
                  required
                  min={1}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Coût construction (€)</label>
                <input
                  type="number"
                  value={devisDoForm.coutConstruction}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, coutConstruction: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Téléphone du souscripteur</label>
              <input
                type="tel"
                value={devisDoForm.telephone}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, telephone: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Adresse de l&apos;opération</label>
              <input
                type="text"
                value={devisDoForm.adresseOperation}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, adresseOperation: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Type de construction</label>
                <select
                  value={devisDoForm.typeConstruction}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, typeConstruction: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">—</option>
                  <option value="Maison unifamiliale">Maison unifamiliale</option>
                  <option value="Maison jumelée">Maison jumelée</option>
                  <option value="Immeuble logements">Immeuble logements</option>
                  <option value="Construction neuve">Construction neuve</option>
                  <option value="Extension">Extension</option>
                  <option value="Rénovation">Rénovation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Clos et couvert</label>
                <select
                  value={devisDoForm.closCouvert}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, closCouvert: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">—</option>
                  <option value="oui">Oui</option>
                  <option value="non">Non</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Destination</label>
              <select
                value={devisDoForm.destination}
                onChange={(e) => setDevisDoForm((f) => ({ ...f, destination: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">—</option>
                <option value="Usage personnel">Usage personnel</option>
                <option value="Location">Location</option>
                <option value="Vente">Vente</option>
                <option value="Exploitation directe">Exploitation directe</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Frais de gestion (€)</label>
                <input
                  type="number"
                  value={devisDoForm.fraisGestion}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, fraisGestion: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Frais de courtage (€)</label>
                <input
                  type="number"
                  value={devisDoForm.fraisCourtage}
                  onChange={(e) => setDevisDoForm((f) => ({ ...f, fraisCourtage: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={devisDoSubmitting}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
            >
              {devisDoSubmitting ? "Création..." : "Ajouter le devis à l'espace client"}
            </button>
          </form>
        </section>

        {/* Demandes devis DO en attente */}
        {data.devisDoLeads && data.devisDoLeads.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Demandes devis dommage ouvrage (en attente)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-medium">Email</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Coût</th>
                    <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Date</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Client</th>
                    <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devisDoLeads.map((d) => {
                    const matchingUser = data.users.find((u) => u.email.toLowerCase() === d.email.toLowerCase())
                    return (
                      <tr key={d.id} className="border-b border-gray-700/50">
                        <td className="p-3 sm:p-4">{d.email}</td>
                        <td className="p-3 sm:p-4">{d.coutTotal ? `${d.coutTotal.toLocaleString("fr-FR")} €` : "—"}</td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 sm:p-4">
                          {matchingUser ? (
                            <span className="text-green-400">✓ Compte existant</span>
                          ) : (
                            <span className="text-sky-400">Créer le compte</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">
                          {!matchingUser ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/gestion/users/create-from-lead", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ leadId: d.id }),
                                  })
                                  const json = await readResponseJson<{ error?: string; email?: string }>(res)
                                  if (!res.ok) throw new Error(json.error || "Erreur")
                                  setToast({ message: `Compte créé pour ${json.email}`, type: "success" })
                                  const dashRes = await fetch("/api/gestion/dashboard")
                                  if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                                } catch (err) {
                                  setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                                }
                              }}
                              className="text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 -m-1"
                            >
                              Créer le compte
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Avenants */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Créer un avenant</h2>
          <form onSubmit={handleCreateAvenant} className="bg-[#252525] rounded-xl p-6 border border-gray-700 space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Client (userId)</label>
              <select
                value={avenantForm.userId}
                onChange={(e) => setAvenantForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {filterUsersBySearch(data.users, searchQuery).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.raisonSociale || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">N° contrat</label>
              <select
                value={avenantForm.contractNumero}
                onChange={(e) => setAvenantForm((f) => ({ ...f, contractNumero: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {contrats.filter((c) => !avenantForm.userId || c.userId === avenantForm.userId).map((c) => (
                  <option key={c.id} value={c.numero}>{c.numero}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Nouveau CA (€)</label>
                <input
                  type="number"
                  value={avenantForm.chiffreAffaires}
                  onChange={(e) => setAvenantForm((f) => ({ ...f, chiffreAffaires: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Nouvelle prime (€)</label>
                <input
                  type="number"
                  value={avenantForm.primeAnnuelle}
                  onChange={(e) => setAvenantForm((f) => ({ ...f, primeAnnuelle: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Nouvelles activités (séparées par des virgules)</label>
              <input
                type="text"
                value={avenantForm.activites}
                onChange={(e) => setAvenantForm((f) => ({ ...f, activites: e.target.value }))}
                placeholder="Optionnel"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Motif</label>
              <input
                type="text"
                value={avenantForm.motif}
                onChange={(e) => setAvenantForm((f) => ({ ...f, motif: e.target.value }))}
                placeholder="Modification contractuelle"
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <p className="text-sm text-sky-400/90">
              Frais d&apos;avenant : 60 € — reportés automatiquement sur la prochaine échéance de prélèvement.
            </p>
            <button
              type="submit"
              disabled={avenantSubmitting}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 font-medium"
            >
              {avenantSubmitting ? "Création..." : "Créer l'avenant"}
            </button>
          </form>
        </section>

        {/* Liste des avenants - historique par client */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Historique des avenants</h2>
          <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 font-medium">N° avenant</th>
                  <th className="text-left p-4 font-medium">Client</th>
                  <th className="text-left p-4 font-medium">Contrat modifié</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(data.documents.filter((d) => d.type === "avenant"), searchQuery).length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-gray-200">Aucun avenant</td></tr>
                ) : (
                  filterBySearch(data.documents.filter((d) => d.type === "avenant"), searchQuery)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((d) => {
                      let avenantData: { contractNumero?: string } = {}
                      if (d.data) {
                        try {
                          avenantData = JSON.parse(d.data) as { contractNumero?: string }
                        } catch {
                          /* ignore */
                        }
                      }
                      return (
                        <tr key={d.id} className="border-b border-gray-700/50">
                          <td className="p-4 font-mono">{d.numero}</td>
                          <td className="p-4">{d.user.raisonSociale || d.user.email}</td>
                          <td className="p-4 font-mono text-gray-200">{avenantData.contractNumero || "—"}</td>
                          <td className="p-4">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="p-4">
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-sky-400 hover:text-sky-300 text-sm min-h-[44px] min-w-[44px] inline-flex items-center -m-1 px-2"
                            >
                              Modifier
                            </button>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Historique des résiliations */}
        {data?.adminActivityLogs && data.adminActivityLogs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Journal d&apos;audit admin (100 derniers)</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Admin</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium">Cible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adminActivityLogs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(l.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="p-4 text-gray-200">{l.adminEmail}</td>
                      <td className="p-4">{l.action}</td>
                      <td className="p-4 text-gray-200">{l.targetType} {l.targetId ? `#${l.targetId.slice(-6)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data?.resiliationLogs && data.resiliationLogs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Historique des résiliations</h2>
            <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Document</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Admin</th>
                    <th className="text-left p-4 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resiliationLogs.map((r) => (
                    <tr key={r.id} className="border-b border-gray-700/50">
                      <td className="p-4">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4 font-mono">{r.document.numero} ({r.document.type})</td>
                      <td className="p-4">{r.document.user.raisonSociale || r.document.user.email}</td>
                      <td className="p-4 text-gray-200">{r.adminEmail}</td>
                      <td className="p-4 text-gray-200">{r.motif || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal modification contrat / avenant */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setEditModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-lg w-full mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Modifier {editModal.type === "contrat" ? "le contrat" : "l'avenant"} {editModal.numero}
            </h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Chiffre d&apos;affaires (€)</label>
                  <input
                    type="number"
                    value={editModal.form.chiffreAffaires}
                    onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, chiffreAffaires: e.target.value } } : m)}
                    placeholder="Optionnel"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Prime annuelle (€)</label>
                  <input
                    type="number"
                    value={editModal.form.primeAnnuelle}
                    onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, primeAnnuelle: e.target.value } } : m)}
                    placeholder="Optionnel"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Activités (séparées par des virgules)</label>
                <input
                  type="text"
                  value={editModal.form.activites}
                  onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, activites: e.target.value } } : m)}
                  placeholder="Ex. Plomberie, Chauffage"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              {editModal.type === "avenant" && (
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Motif avenant</label>
                  <input
                    type="text"
                    value={editModal.form.motifAvenant}
                    onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, motifAvenant: e.target.value } } : m)}
                    placeholder="Modification contractuelle"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Date d&apos;effet</label>
                  <input
                    type="text"
                    value={editModal.form.dateEffet}
                    onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, dateEffet: e.target.value } } : m)}
                    placeholder="JJ/MM/AAAA"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Date d&apos;échéance</label>
                  <input
                    type="text"
                    value={editModal.form.dateEcheance}
                    onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, dateEcheance: e.target.value } } : m)}
                    placeholder="JJ/MM/AAAA"
                    className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {editSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal autorisation annulation / résiliation */}
      {resiliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setResiliationModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Autoriser l&apos;annulation</h3>
            <p className="text-sm text-gray-200 mb-4">
              Le document sera marqué comme résilié. Un email de confirmation sera envoyé au client.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">Motif (optionnel)</label>
              <input
                type="text"
                value={resiliationModal.motif}
                onChange={(e) => setResiliationModal((m) => m ? { ...m, motif: e.target.value } : m)}
                placeholder="Ex. demande client, fin d'activité..."
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResiliationModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={() => handleStatusChange(resiliationModal.docId, "resilie", resiliationModal.motif)}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal remise personnalisée étude */}
      {etudeMiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEtudeMiseModal(null)}>
          <div className="bg-[#252525] border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Faire une remise au client</h3>
            <p className="text-sm text-gray-200 mb-4">
              {etudeMiseModal.raisonSociale || etudeMiseModal.email} — Envoyez une proposition avec prime personnalisée. Le client recevra un email avec un lien pour finaliser sa souscription.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">Prime annuelle personnalisée (€)</label>
              <input
                type="number"
                value={etudeMiseModal.primeAnnuelle}
                onChange={(e) => setEtudeMiseModal((m) => m ? { ...m, primeAnnuelle: e.target.value } : m)}
                placeholder="Ex. 1200"
                min={1}
                required
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEtudeMiseModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  const prime = Number(etudeMiseModal.primeAnnuelle)
                  if (!prime || prime <= 0) return
                  setEtudeMiseSubmitting(true)
                  try {
                    const res = await fetch("/api/gestion/etude/remise", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ etudeLeadId: etudeMiseModal.id, primeAnnuelle: prime }),
                    })
                    const json = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) throw new Error(json.error || "Erreur")
                    setToast({ message: "Remise envoyée au client par email.", type: "success" })
                    setEtudeMiseModal(null)
                    const dashRes = await fetch("/api/gestion/dashboard")
                    if (dashRes.ok) setData(await readResponseJson<DashboardData>(dashRes))
                  } catch (err) {
                    setToast({ message: err instanceof Error ? err.message : "Erreur", type: "error" })
                  } finally {
                    setEtudeMiseSubmitting(false)
                  }
                }}
                disabled={etudeMiseSubmitting || !etudeMiseModal.primeAnnuelle || Number(etudeMiseModal.primeAnnuelle) <= 0}
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {etudeMiseSubmitting ? "Envoi..." : "Envoyer la remise"}
              </button>
            </div>
          </div>
        </div>
      )}

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
