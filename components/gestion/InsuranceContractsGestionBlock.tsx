"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { primeTrimestrielle } from "@/lib/mollie-sepa"
import { readResponseJson } from "@/lib/read-response-json"

export type InsuranceContractGestionRow = {
  id: string
  contractNumber: string
  productType: string
  clientName: string
  userId: string | null
  premium: number
  status: string
  paidAt: string | null
  validUntil: string | null
  createdAt: string
  user: { id: string; email: string; raisonSociale: string | null } | null
  lifecyclePayments: {
    id: string
    amount: number
    status: string
    paidAt: string | null
    createdAt: string
  }[]
}

type Props = {
  contracts: InsuranceContractGestionRow[]
  searchQuery: string
  onRefresh: () => Promise<void>
  setToast: (t: { message: string; type?: "success" | "error" }) => void
}

function matchesSearch(c: InsuranceContractGestionRow, q: string): boolean {
  if (!q.trim()) return true
  const s = q.toLowerCase()
  return (
    c.contractNumber.toLowerCase().includes(s) ||
    c.clientName.toLowerCase().includes(s) ||
    c.productType.toLowerCase().includes(s) ||
    (c.user?.email ? c.user.email.toLowerCase().includes(s) : false)
  )
}

export function InsuranceContractsGestionBlock({ contracts, searchQuery, onRefresh, setToast }: Props) {
  const [productFilter, setProductFilter] = useState<string>("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (!matchesSearch(c, searchQuery)) return false
      if (productFilter === "all") return true
      return c.productType === productFilter
    })
  }, [contracts, searchQuery, productFilter])

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id)
    try {
      await fn()
      await onRefresh()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Erreur", type: "error" })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="contrats-plateforme" className="scroll-mt-24 mb-12">
      <h2 className="text-lg font-semibold text-white mb-2">Contrats plateforme (manuel)</h2>
      <div className="mb-4 p-4 rounded-xl border border-amber-800/60 bg-amber-950/25 text-sm text-amber-100/95">
        <p className="font-medium text-amber-200 mb-1">RC Fabriquant — cotisation trimestrielle (comme la décennale)</p>
        <p className="text-amber-100/90">
          Le champ <strong>Prime TTC</strong> sur le contrat sert de <strong>montant Mollie pour la prochaine échéance</strong> (virement).
          En usage trimestriel, fixez typiquement <strong>prime annuelle ÷ 4</strong> (indicatif affiché pour RC Fab). Entre deux échéances, ajustez la
          prime via « Modifier prime ». Valider / refuser, régénérer les PDF, liens vérification et fiche client restent ici — pas d’automatisation
          SEPA dédiée RC sur ce flux.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["all", "Tous"],
            ["rc_fabriquant", "RC Fabriquant"],
            ["decennale", "Décennale"],
            ["do", "DO"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setProductFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              productFilter === v
                ? "bg-[#2563eb] border-[#2563eb] text-white"
                : "bg-[#1a1a1a] border-gray-600 text-gray-200 hover:border-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          href="/admin"
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-200 hover:border-gray-500 inline-flex items-center"
        >
          Vue admin (100 contrats)
        </Link>
      </div>

      <div className="bg-[#252525] rounded-xl overflow-x-auto border border-gray-700 -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 sm:p-4 font-medium">N° / Produit</th>
              <th className="text-left p-3 sm:p-4 font-medium">Client</th>
              <th className="text-left p-3 sm:p-4 font-medium">Prime</th>
              <th className="text-left p-3 sm:p-4 font-medium">Statut</th>
              <th className="text-left p-3 sm:p-4 font-medium">Paiements</th>
              <th className="text-left p-3 sm:p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-gray-200">
                  Aucun contrat (filtre ou recherche).
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const paidCount = c.lifecyclePayments.filter((p) => p.status === "paid").length
                const showRcFabHints = c.productType === "rc_fabriquant" && c.premium > 0
                return (
                  <tr key={c.id} className="border-b border-gray-700/50">
                    <td className="p-3 sm:p-4">
                      <span className="font-mono text-xs text-white">{c.contractNumber}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{c.productType}</p>
                    </td>
                    <td className="p-3 sm:p-4">
                      <p className="text-gray-100">{c.clientName}</p>
                      {c.user?.email ? <p className="text-xs text-gray-400">{c.user.email}</p> : null}
                    </td>
                    <td className="p-3 sm:p-4">
                      <p className="text-white font-medium">{c.premium.toLocaleString("fr-FR")} €</p>
                      {showRcFabHints ? (
                        <p className="text-xs text-teal-300/90 mt-1">
                          Indic. : si prime = <strong>annuelle</strong> → {primeTrimestrielle(c.premium).toLocaleString("fr-FR")} €/trim · si
                          prime = <strong>1 trimestre</strong> → {(c.premium * 4).toLocaleString("fr-FR")} €/an
                        </p>
                      ) : null}
                      {c.productType === "rc_fabriquant" ? (
                        <p className="text-xs text-gray-500 mt-1">Montant du prochain virement Mollie (modifiable)</p>
                      ) : null}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="text-xs text-gray-200">{c.status}</span>
                      {c.paidAt ? (
                        <p className="text-xs text-gray-500 mt-1">Payé {new Date(c.paidAt).toLocaleDateString("fr-FR")}</p>
                      ) : null}
                    </td>
                    <td className="p-3 sm:p-4 text-xs text-gray-300">
                      {paidCount}/{c.lifecyclePayments.length} ligne(s) — dernier :{" "}
                      {c.lifecyclePayments[0]
                        ? `${c.lifecyclePayments[0].status} ${c.lifecyclePayments[0].amount.toLocaleString("fr-FR")} €`
                        : "—"}
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <a
                          href={`/verify/${encodeURIComponent(c.contractNumber)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:text-sky-300 text-xs"
                        >
                          Vérifier
                        </a>
                        <a
                          href={`/api/contracts/${c.id}/pdf/quote`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:text-sky-300 text-xs"
                        >
                          PDF devis
                        </a>
                        <a
                          href={`/api/contracts/${c.id}/pdf/policy`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:text-sky-300 text-xs"
                        >
                          PDF CP
                        </a>
                        {c.status === CONTRACT_STATUS.active ? (
                          <>
                            <a
                              href={`/api/contracts/${c.id}/pdf/certificate`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 text-xs"
                            >
                              Attestation
                            </a>
                            <a
                              href={`/api/contracts/${c.id}/pdf/invoice`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 text-xs"
                            >
                              Facture
                            </a>
                          </>
                        ) : null}
                        {c.userId ? (
                          <Link href={`/gestion/clients/${c.userId}`} className="text-[#2563eb] hover:underline text-xs">
                            Fiche client
                          </Link>
                        ) : null}
                        {(c.status === CONTRACT_STATUS.approved || c.status === CONTRACT_STATUS.active) && (
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() =>
                              run(c.id, async () => {
                                const raw = window.prompt(
                                  "Nouvelle prime TTC (prochain montant Mollie / échéance), ex. 450.50 :",
                                  String(c.premium)
                                )
                                if (raw == null) return
                                const premium = parseFloat(raw.replace(",", "."))
                                if (!Number.isFinite(premium) || premium <= 0) {
                                  setToast({ message: "Montant invalide", type: "error" })
                                  return
                                }
                                const res = await fetch(`/api/gestion/insurance-contracts/${c.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ premium }),
                                })
                                const j = await readResponseJson<{ error?: string }>(res)
                                if (!res.ok) throw new Error(j.error || "Erreur")
                                setToast({ message: "Prime mise à jour", type: "success" })
                              })
                            }
                            className="text-amber-400 hover:text-amber-300 text-xs disabled:opacity-50"
                          >
                            Modifier prime
                          </button>
                        )}
                        {c.status === CONTRACT_STATUS.pending_validation && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={() =>
                                run(c.id, async () => {
                                  const res = await fetch("/api/contracts/validate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ contractId: c.id, approve: true }),
                                  })
                                  const j = await readResponseJson<{ error?: string }>(res)
                                  if (!res.ok) throw new Error(j.error || "Erreur")
                                  setToast({ message: "Contrat approuvé", type: "success" })
                                })
                              }
                              className="text-green-400 hover:text-green-300 text-xs disabled:opacity-50"
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={() =>
                                run(c.id, async () => {
                                  const reason = window.prompt("Motif du refus :")?.trim()
                                  if (reason == null) return
                                  const res = await fetch("/api/contracts/validate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ contractId: c.id, approve: false, reason: reason || "Refus" }),
                                  })
                                  const j = await readResponseJson<{ error?: string }>(res)
                                  if (!res.ok) throw new Error(j.error || "Erreur")
                                  setToast({ message: "Contrat refusé", type: "success" })
                                })
                              }
                              className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() =>
                            run(c.id, async () => {
                              const res = await fetch(`/api/contracts/${c.id}/regenerate`, { method: "POST" })
                              const j = await readResponseJson<{ error?: string }>(res)
                              if (!res.ok) throw new Error(j.error || "Erreur")
                              setToast({ message: "Régénération PDF lancée", type: "success" })
                            })
                          }
                          className="text-violet-400 hover:text-violet-300 text-xs disabled:opacity-50"
                        >
                          Régénérer PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
