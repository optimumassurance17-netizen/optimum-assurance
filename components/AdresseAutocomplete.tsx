"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { inputTextDark } from "@/lib/form-input-styles"

export type AdressePick = {
  adresse: string
  codePostal: string
  ville: string
  label: string
}

type Props = {
  /** Afficher le bloc (ex. après échec SIRET) */
  show: boolean
  onPick: (a: AdressePick) => void
  /** Texte d’introduction */
  title?: string
}

/**
 * Autocomplétion adresse via la Base Adresse nationale (API publique).
 */
export function AdresseAutocomplete({ show, onPick, title }: Props) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AdressePick[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/adresse/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setResults([])
        return
      }
      const list = (data.suggestions || []) as {
        label: string
        adresse: string
        codePostal: string
        ville: string
      }[]
      setResults(
        list.map((s) => ({
          label: s.label,
          adresse: s.adresse,
          codePostal: s.codePostal,
          ville: s.ville,
        }))
      )
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!show) {
      setQuery("")
      setResults([])
      setOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 380)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, show, search])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [])

  if (!show) return null

  return (
    <div
      ref={wrapRef}
      className="mt-4 p-4 rounded-xl border border-[#2563eb]/30 bg-[#f8fafc] text-left"
      role="search"
    >
      <p className="text-sm font-medium text-[#0a0a0a] mb-2">
        {title ?? "SIRET non trouvé : recherchez votre adresse (Base Adresse nationale)"}
      </p>
      <label htmlFor="ban-adresse-q" className="sr-only">
        Rechercher une adresse
      </label>
      <input
        id="ban-adresse-q"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Ex : 12 rue de Rivoli Paris"
        className={`w-full rounded-xl px-4 py-3 text-sm bg-white border border-[#d4d4d4] ${inputTextDark} focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none`}
      />
      {loading && (
        <p className="text-xs text-black mt-2" aria-live="polite">
          Recherche…
        </p>
      )}
      {open && results.length > 0 && (
        <ul
          className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white shadow-sm"
          role="listbox"
        >
          {results.map((r, i) => (
            <li key={`${r.label}-${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#dbeafe] border-b border-[#f0f0f0] last:border-0 text-black"
                onClick={() => {
                  onPick(r)
                  setOpen(false)
                  setQuery("")
                  setResults([])
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 3 && !loading && results.length === 0 && open && (
        <p className="text-xs text-black mt-2">Aucun résultat — affinez la recherche.</p>
      )}
    </div>
  )
}
