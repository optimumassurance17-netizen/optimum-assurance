"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type ClientQuickSearchResult = {
  id: string
  email: string
  raisonSociale: string | null
  siret: string | null
}

type ClientQuickSearchResponse = {
  results?: ClientQuickSearchResult[]
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const canSearch = trimmedQuery.length >= 2

  useEffect(() => {
    if (!canSearch) {
      setResults([])
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
        }
      } catch (err) {
        if (!cancelled) {
          setResults([])
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
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-300">Aucune fiche client trouvée.</p>
          ) : (
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
          )}
          {results.length > 0 ? (
            <p className="border-t border-gray-700 px-4 py-2 text-[11px] text-gray-500">
              Astuce : appuyez sur Entrée pour ouvrir le premier résultat.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
