"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { readResponseJson } from "@/lib/read-response-json"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { getInsuranceProductLabel } from "@/lib/insurance-product"
import {
  canValidateDoPaymentManually,
  doPaymentStatusLabel,
  ValidateDoPaymentButton,
  type DoPaymentContract,
} from "@/components/gestion/ValidateDoPaymentButton"

type ClientQuickSearchResult = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
}

type DoDevisSearchResult = {
  id: string
  email: string
  raisonSociale: string | null
  href: string
}

type ContractSearchResult = DoPaymentContract & {
  id: string
  contractNumber: string
  clientName: string
  premium: number
  userId: string | null
}

type ClientQuickSearchResponse = {
  results?: ClientQuickSearchResult[]
  devisDoLeads?: DoDevisSearchResult[]
  contracts?: ContractSearchResult[]
  error?: string
}

type ClientQuickSearchProps = {
  label: string
  placeholder?: string
  helperText?: string
  className?: string
}

const SEARCH_DEBOUNCE_MS = 180

export function ClientQuickSearch({
  label,
  placeholder = "Nom, email ou SIRET…",
  helperText,
  className = "",
}: ClientQuickSearchProps) {
  const router = useRouter()
  const inputId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ClientQuickSearchResult[]>([])
  const [devisDoLeads, setDevisDoLeads] = useState<DoDevisSearchResult[]>([])
  const [contracts, setContracts] = useState<ContractSearchResult[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const canSearch = trimmedQuery.length >= 2

  useEffect(() => {
    if (!canSearch) {
      setResults([])
      setDevisDoLeads([])
      setContracts([])
      setNotice(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/gestion/clients/search?q=${encodeURIComponent(trimmedQuery)}`)
        const json = await readResponseJson<ClientQuickSearchResponse>(res)
        if (!res.ok) {
          throw new Error(json.error || "Erreur recherche fiche client")
        }
        if (!cancelled) {
          setResults(Array.isArray(json.results) ? json.results : [])
          setDevisDoLeads(Array.isArray(json.devisDoLeads) ? json.devisDoLeads : [])
          setContracts(Array.isArray(json.contracts) ? json.contracts : [])
          setNotice(null)
        }
      } catch (err) {
        if (!cancelled) {
          setResults([])
          setDevisDoLeads([])
          setContracts([])
          setError(err instanceof Error ? err.message : "Erreur recherche fiche client")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canSearch, trimmedQuery])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (results[0]) {
      router.push(`/gestion/clients/${results[0].id}`)
      return
    }
    if (contracts[0]?.userId) {
      router.push(`/gestion/clients/${contracts[0].userId}`)
      return
    }
    if (devisDoLeads[0]?.href.startsWith("/gestion#")) {
      router.push(devisDoLeads[0].href)
    }
  }

  return (
    <div className={className}>
      <form className="space-y-2" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-200" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-600 bg-[#252525] px-4 py-2 text-white placeholder-gray-500"
        />
      </form>
      {helperText ? <p className="mt-2 text-xs text-gray-400">{helperText}</p> : null}
      {canSearch ? (
        <div className="mt-3 rounded-xl border border-gray-700 bg-[#202020]">
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-300">Recherche en cours…</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-red-300">{error}</p>
          ) : results.length === 0 && devisDoLeads.length === 0 && contracts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-300">Aucune fiche client trouvée.</p>
          ) : (
            <div>
              {results.length > 0 ? (
                <ul className="divide-y divide-gray-700">
                  {results.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/gestion/clients/${client.id}`}
                        className="flex flex-col gap-1 px-4 py-3 hover:bg-[#282828]"
                      >
                        <span className="text-sm font-medium text-white">
                          {client.raisonSociale || client.email}
                        </span>
                        <span className="text-xs text-gray-300">{client.email}</span>
                        {client.siret ? (
                          <span className="text-[11px] font-mono text-gray-400">{client.siret}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-300">Aucune fiche client trouvée.</p>
              )}
              {contracts.length > 0 ? (
                <ul className="divide-y divide-gray-700 border-t border-gray-700">
                  {contracts.map((contract) => (
                    <li key={contract.id} className="flex flex-col gap-2 px-4 py-3">
                      <div>
                        <span className="text-[11px] uppercase tracking-wide text-emerald-300">Contrat</span>
                        <p className="text-sm font-medium text-white">{contract.clientName}</p>
                        <p className="text-xs text-gray-300">
                          {getInsuranceProductLabel(contract.productType)} · {contract.contractNumber} ·{" "}
                          {doPaymentStatusLabel(contract)} · {contract.premium.toLocaleString("fr-FR")} €
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {contract.userId ? (
                          <Link
                            href={`/gestion/clients/${contract.userId}`}
                            className="text-xs font-medium text-[#93c5fd] hover:text-white"
                          >
                            Ouvrir la fiche
                          </Link>
                        ) : null}
                        {contract.productType === "do" && contract.status === CONTRACT_STATUS.pending_validation ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-green-300 hover:text-green-200"
                            onClick={async () => {
                              const res = await fetch("/api/contracts/validate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ contractId: contract.id, approve: true }),
                              })
                              const body = await readResponseJson<{ error?: string }>(res)
                              if (!res.ok) {
                                setNotice(body.error || "Impossible d'approuver le contrat.")
                                return
                              }
                              setContracts((current) =>
                                current.map((row) =>
                                  row.id === contract.id ? { ...row, status: CONTRACT_STATUS.approved } : row
                                )
                              )
                              setNotice(`Contrat ${contract.contractNumber} approuvé. Vous pouvez valider le paiement.`)
                            }}
                          >
                            Approuver
                          </button>
                        ) : null}
                        {canValidateDoPaymentManually(contract) ? (
                          <ValidateDoPaymentButton
                            contractId={contract.id}
                            contractNumber={contract.contractNumber}
                            premium={contract.premium}
                            awaitingPayment={contract.status === CONTRACT_STATUS.approved && !contract.paidAt}
                            onResult={(result) => setNotice(result.message)}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {notice ? <p className="border-t border-gray-700 px-4 py-2 text-sm text-amber-100">{notice}</p> : null}
              {devisDoLeads.length > 0 ? (
                <ul className="divide-y divide-gray-700 border-t border-gray-700">
                  {devisDoLeads.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={lead.href.startsWith("/gestion#") ? lead.href : "/gestion#demandes-devis-do"}
                        className="flex flex-col gap-1 px-4 py-3 hover:bg-[#282828]"
                      >
                        <span className="text-[11px] uppercase tracking-wide text-sky-300">Demande devis</span>
                        <span className="text-sm font-medium text-white">
                          {lead.raisonSociale || lead.email}
                        </span>
                        <span className="text-xs text-gray-300">{lead.email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          {results.length > 0 || devisDoLeads.length > 0 || contracts.length > 0 ? (
            <p className="border-t border-gray-700 px-4 py-2 text-[11px] text-gray-500">
              Astuce : appuyez sur Entrée pour ouvrir le premier résultat.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
