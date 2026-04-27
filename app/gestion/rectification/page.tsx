"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { readResponseJson } from "@/lib/read-response-json"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { Toast } from "@/components/Toast"

type DashboardContract = {
  id: string
  contractNumber: string
  productType: string
  clientName: string
  userId: string | null
  premium: number
  status: string
  paidAt: string | null
  createdAt: string
  rejectedReason?: string | null
  user: { id: string; email: string; raisonSociale: string | null } | null
}

type DashboardPayment = {
  id: string
  userId: string
  molliePaymentId: string
  amount: number
  status: string
  paidAt: string | null
  createdAt: string
  user: { email: string; raisonSociale: string | null }
}

type DashboardPendingSignature = {
  id: string
  signatureRequestId: string
  contractNumero: string
  createdAt: string
  userId: string
  user: { id: string; email: string; raisonSociale: string | null } | null
  signatureFlow: "custom_pdf" | "decennale"
  signatureFlowLabel?: string
  ageHours: number
  repairEligible?: boolean
}

type DashboardUser = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
}

type DashboardData = {
  users: DashboardUser[]
  insuranceContracts: DashboardContract[]
  payments: DashboardPayment[]
  pendingSignatures: DashboardPendingSignature[]
}

function formatMoney(value: number): string {
  return `${value.toLocaleString("fr-FR")} €`
}

function asDateInputValue(raw: string | null): string {
  if (!raw) return ""
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function toIsoFromDateInput(raw: string): string | null {
  const normalized = raw.trim()
  if (!normalized) return null
  const d = new Date(`${normalized}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function GestionRectificationPage() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null)
  const [savingContractId, setSavingContractId] = useState<string | null>(null)
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null)
  const [cancellingSignatureId, setCancellingSignatureId] = useState<string | null>(null)
  const [repairingSignatureId, setRepairingSignatureId] = useState<string | null>(null)
  const [contractForms, setContractForms] = useState<
    Record<
      string,
      {
        premium: string
        status: string
        rejectedReason: string
        paidAt: string
      }
    >
  >({})
  const [paymentForms, setPaymentForms] = useState<
    Record<
      string,
      {
        status: string
        amount: string
        paidAt: string
      }
    >
  >({})

  const loadDashboard = async () => {
    const res = await fetch("/api/gestion/dashboard", { credentials: "include" })
    const json = await readResponseJson<DashboardData & { error?: string }>(res)
    if (!res.ok) throw new Error(json.error || "Impossible de charger la gestion.")
    setData({
      users: Array.isArray(json.users) ? json.users : [],
      insuranceContracts: Array.isArray(json.insuranceContracts) ? json.insuranceContracts : [],
      payments: Array.isArray(json.payments) ? json.payments : [],
      pendingSignatures: Array.isArray(json.pendingSignatures) ? json.pendingSignatures : [],
    })
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion?callbackUrl=/gestion/rectification")
      return
    }
    if (status !== "authenticated") return
    let cancelled = false
    void (async () => {
      try {
        await loadDashboard()
      } catch (error) {
        if (!cancelled) {
          setToast({
            type: "error",
            message: error instanceof Error ? error.message : "Erreur chargement",
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, router])

  useEffect(() => {
    if (!data) return
    setContractForms((prev) => {
      const next = { ...prev }
      for (const c of data.insuranceContracts) {
        if (!next[c.id]) {
          next[c.id] = {
            premium: String(c.premium),
            status: c.status,
            rejectedReason: c.rejectedReason ?? "",
            paidAt: asDateInputValue(c.paidAt),
          }
        }
      }
      return next
    })
    setPaymentForms((prev) => {
      const next = { ...prev }
      for (const p of data.payments) {
        if (!next[p.id]) {
          next[p.id] = {
            status: p.status,
            amount: String(p.amount),
            paidAt: asDateInputValue(p.paidAt),
          }
        }
      }
      return next
    })
  }, [data])

  const filteredContracts = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.insuranceContracts.slice(0, 120)
    return data.insuranceContracts
      .filter((c) => {
        return (
          c.contractNumber.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.productType.toLowerCase().includes(q) ||
          (c.user?.email || "").toLowerCase().includes(q)
        )
      })
      .slice(0, 120)
  }, [data, query])

  const filteredPayments = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.payments.slice(0, 120)
    return data.payments
      .filter((p) => {
        return (
          p.molliePaymentId.toLowerCase().includes(q) ||
          (p.user.raisonSociale || "").toLowerCase().includes(q) ||
          p.user.email.toLowerCase().includes(q)
        )
      })
      .slice(0, 120)
  }, [data, query])

  const filteredSignatures = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.pendingSignatures.slice(0, 120)
    return data.pendingSignatures
      .filter((s) => {
        return (
          s.signatureRequestId.toLowerCase().includes(q) ||
          s.contractNumero.toLowerCase().includes(q) ||
          (s.user?.email || "").toLowerCase().includes(q)
        )
      })
      .slice(0, 120)
  }, [data, query])

  if (status === "loading" || loading) {
    return (
      <main className="gestion-app min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-gray-200">Chargement rectification…</p>
      </main>
    )
  }

  return (
    <main className="gestion-app min-h-screen bg-[#1a1a1a] text-gray-200">
      <header className="border-b border-gray-700 bg-[#202020]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Gestion — Rectification 100%</h1>
            <p className="text-sm text-gray-400">
              Contrats, paiements et signatures en attente : rectification complète sans sortir de la gestion.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/gestion" className="text-sm text-gray-200 hover:text-white">
              ← Retour dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                void (async () => {
                  try {
                    await loadDashboard()
                    setToast({ type: "success", message: "Données actualisées." })
                  } catch (error) {
                    setToast({
                      type: "error",
                      message: error instanceof Error ? error.message : "Erreur rafraîchissement",
                    })
                  } finally {
                    setLoading(false)
                  }
                })()
              }}
              className="text-xs sm:text-sm px-3 py-2 rounded-lg border border-[#2563eb]/70 text-[#93c5fd] hover:bg-[#2563eb]/20"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="rounded-xl border border-gray-700 bg-[#222] p-4">
          <label className="block text-sm text-gray-300 mb-2">Recherche transverse (client, contrat, paiement, signature)</label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ex: DUPONT, tr_..., PDF-PENDING, RC Fabriquant"
            className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        <section className="rounded-xl border border-gray-700 bg-[#252525] p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Rectification contrats plateforme</h2>
          <div className="space-y-3">
            {filteredContracts.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun contrat trouvé avec ce filtre.</p>
            ) : (
              filteredContracts.map((c) => {
                const form = contractForms[c.id] ?? {
                  premium: String(c.premium),
                  status: c.status,
                  rejectedReason: c.rejectedReason ?? "",
                  paidAt: asDateInputValue(c.paidAt),
                }
                return (
                  <div key={c.id} className="rounded-lg border border-gray-700 bg-[#1f1f1f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="font-mono text-sm text-white">{c.contractNumber}</p>
                        <p className="text-xs text-gray-400">
                          {c.productType} · {c.clientName} · {c.user?.email || "sans utilisateur lié"}
                        </p>
                      </div>
                      {c.userId ? (
                        <Link href={`/gestion/clients/${c.userId}`} className="text-xs text-sky-400 hover:text-sky-300">
                          Ouvrir fiche client
                        </Link>
                      ) : null}
                    </div>

                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Prime (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.premium}
                          onChange={(e) =>
                            setContractForms((prev) => ({
                              ...prev,
                              [c.id]: { ...form, premium: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Statut</label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setContractForms((prev) => ({
                              ...prev,
                              [c.id]: { ...form, status: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        >
                          {Object.values(CONTRACT_STATUS).map((statusValue) => (
                            <option key={statusValue} value={statusValue}>
                              {statusValue}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Date paiement</label>
                        <input
                          type="date"
                          value={form.paidAt}
                          onChange={(e) =>
                            setContractForms((prev) => ({
                              ...prev,
                              [c.id]: { ...form, paidAt: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Motif refus</label>
                        <input
                          type="text"
                          value={form.rejectedReason}
                          onChange={(e) =>
                            setContractForms((prev) => ({
                              ...prev,
                              [c.id]: { ...form, rejectedReason: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={savingContractId === c.id}
                        onClick={async () => {
                          setSavingContractId(c.id)
                          try {
                            const payload = {
                              premium: Number(form.premium),
                              status: form.status,
                              rejectedReason: form.rejectedReason,
                              paidAt: toIsoFromDateInput(form.paidAt),
                            }
                            const res = await fetch(`/api/gestion/insurance-contracts/${c.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            })
                            const json = await readResponseJson<{ error?: string }>(res)
                            if (!res.ok) throw new Error(json.error || "Rectification contrat impossible")
                            await loadDashboard()
                            setToast({ type: "success", message: `Contrat ${c.contractNumber} rectifié.` })
                          } catch (error) {
                            setToast({
                              type: "error",
                              message:
                                error instanceof Error ? error.message : "Erreur rectification contrat.",
                            })
                          } finally {
                            setSavingContractId(null)
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs disabled:opacity-50"
                      >
                        {savingContractId === c.id ? "Enregistrement..." : "Enregistrer rectification"}
                      </button>
                      <span className="text-xs text-gray-400">
                        Prime actuelle : {formatMoney(c.premium)} · statut : {c.status}
                        {c.paidAt ? ` · payé le ${new Date(c.paidAt).toLocaleDateString("fr-FR")}` : " · non payé"}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-[#252525] p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Rectification paiements</h2>
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun paiement trouvé avec ce filtre.</p>
            ) : (
              filteredPayments.map((p) => {
                const form = paymentForms[p.id] ?? {
                  status: p.status,
                  amount: String(p.amount),
                  paidAt: asDateInputValue(p.paidAt),
                }
                return (
                  <div key={p.id} className="rounded-lg border border-gray-700 bg-[#1f1f1f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="font-mono text-sm text-white">{p.molliePaymentId}</p>
                        <p className="text-xs text-gray-400">
                          {(p.user.raisonSociale || p.user.email).trim()} · {formatMoney(p.amount)}
                        </p>
                      </div>
                      <Link href={`/gestion/clients/${p.userId}`} className="text-xs text-sky-400 hover:text-sky-300">
                        Ouvrir fiche client
                      </Link>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Statut</label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setPaymentForms((prev) => ({
                              ...prev,
                              [p.id]: { ...form, status: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        >
                          <option value="paid">paid</option>
                          <option value="pending">pending</option>
                          <option value="failed">failed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Montant (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) =>
                            setPaymentForms((prev) => ({
                              ...prev,
                              [p.id]: { ...form, amount: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Date paiement</label>
                        <input
                          type="date"
                          value={form.paidAt}
                          onChange={(e) =>
                            setPaymentForms((prev) => ({
                              ...prev,
                              [p.id]: { ...form, paidAt: e.target.value },
                            }))
                          }
                          className="w-full bg-[#141414] border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={savingPaymentId === p.id}
                        onClick={async () => {
                          setSavingPaymentId(p.id)
                          try {
                            const payload = {
                              status: form.status,
                              amount: Number(form.amount),
                              paidAt: toIsoFromDateInput(form.paidAt),
                            }
                            const res = await fetch(`/api/gestion/payments/${p.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            })
                            const json = await readResponseJson<{ error?: string }>(res)
                            if (!res.ok) throw new Error(json.error || "Rectification paiement impossible")
                            await loadDashboard()
                            setToast({ type: "success", message: `Paiement ${p.molliePaymentId} rectifié.` })
                          } catch (error) {
                            setToast({
                              type: "error",
                              message:
                                error instanceof Error ? error.message : "Erreur rectification paiement.",
                            })
                          } finally {
                            setSavingPaymentId(null)
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-[#16a34a] hover:bg-[#15803d] text-white text-xs disabled:opacity-50"
                      >
                        {savingPaymentId === p.id ? "Enregistrement..." : "Enregistrer rectification"}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-[#252525] p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Rectification signatures en attente</h2>
          <div className="space-y-3">
            {filteredSignatures.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune signature en attente.</p>
            ) : (
              filteredSignatures.map((s) => (
                <div key={s.signatureRequestId} className="rounded-lg border border-gray-700 bg-[#1f1f1f] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-white">{s.signatureRequestId}</p>
                      <p className="text-xs text-gray-400">
                        {s.contractNumero} · {s.signatureFlow === "custom_pdf" ? (s.signatureFlowLabel || "custom_pdf") : "décennale"} ·
                        {" "}{s.user?.email || "utilisateur introuvable"} · âge {s.ageHours}h
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {s.userId ? (
                        <Link href={`/gestion/clients/${s.userId}`} className="text-xs text-sky-400 hover:text-sky-300">
                          Fiche client
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={cancellingSignatureId === s.signatureRequestId}
                        onClick={async () => {
                          if (!window.confirm("Annuler cette demande de signature ?")) return
                          setCancellingSignatureId(s.signatureRequestId)
                          try {
                            const res = await fetch(
                              `/api/gestion/pending-signatures/${encodeURIComponent(s.signatureRequestId)}`,
                              { method: "DELETE" }
                            )
                            const json = await readResponseJson<{ error?: string }>(res)
                            if (!res.ok) throw new Error(json.error || "Annulation impossible")
                            await loadDashboard()
                            setToast({ type: "success", message: "Signature en attente annulée." })
                          } catch (error) {
                            setToast({
                              type: "error",
                              message:
                                error instanceof Error ? error.message : "Erreur annulation signature.",
                            })
                          } finally {
                            setCancellingSignatureId(null)
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-[#b91c1c] hover:bg-[#991b1b] text-white text-xs disabled:opacity-50"
                      >
                        {cancellingSignatureId === s.signatureRequestId ? "Annulation..." : "Annuler"}
                      </button>
                      {s.repairEligible ? (
                        <button
                          type="button"
                          disabled={repairingSignatureId === s.signatureRequestId}
                          onClick={async () => {
                            setRepairingSignatureId(s.signatureRequestId)
                            try {
                              const res = await fetch("/api/gestion/signatures/repair", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ signatureRequestId: s.signatureRequestId }),
                              })
                              const json = await readResponseJson<{ error?: string }>(res)
                              if (!res.ok) throw new Error(json.error || "Réparation impossible")
                              await loadDashboard()
                              setToast({ type: "success", message: "Réparation signature effectuée." })
                            } catch (error) {
                              setToast({
                                type: "error",
                                message:
                                  error instanceof Error ? error.message : "Erreur réparation signature.",
                              })
                            } finally {
                              setRepairingSignatureId(null)
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs disabled:opacity-50"
                        >
                          {repairingSignatureId === s.signatureRequestId ? "Réparation..." : "Réparer"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  )
}
