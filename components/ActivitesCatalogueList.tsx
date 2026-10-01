"use client"

import { useMemo, useState } from "react"

function activiteAnchorId(activite: string): string {
  return activite
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

type ActiviteItem = {
  activite: string
  description: string
  exclusions: string[]
}

type ActiviteGroup = {
  categorie: string
  items: ActiviteItem[]
}

export function ActivitesCatalogueList({ groups }: { groups: ActiviteGroup[] }) {
  const [query, setQuery] = useState("")
  const normalized = query.trim().toLowerCase()

  const visible = useMemo(() => {
    if (!normalized) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${item.activite} ${item.description} ${item.exclusions.join(" ")}`.toLowerCase()
          return haystack.includes(normalized) || group.categorie.toLowerCase().includes(normalized)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, normalized])

  const count = visible.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div>
      <label htmlFor="filtre-activite" className="block text-sm font-medium text-[#0a0a0a] mb-2">
        Rechercher une activité
      </label>
      <input
        id="filtre-activite"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex. plomberie, étanchéité, architecte"
        className="mb-3 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-[#0a0a0a]"
      />
      <p className="mb-8 text-sm text-[#171717]">{count} activité(s) affichée(s)</p>

      <div className="space-y-10">
        {visible.map((group) => (
          <section key={group.categorie}>
            <h2 className="text-2xl font-bold text-[#0a0a0a] mb-4">{group.categorie}</h2>
            <div className="space-y-4">
              {group.items.map((item) => (
                <article
                  key={item.activite}
                  id={activiteAnchorId(item.activite)}
                  className="rounded-2xl border border-[#e5e5e5] bg-white p-5"
                >
                  <h3 className="text-lg font-bold text-[#0a0a0a]">{item.activite}</h3>
                  <p className="mt-2 text-[#171717] leading-relaxed">{item.description}</p>
                  <p className="mt-4 text-sm font-semibold text-[#0a0a0a]">Exclusions de cette activité</p>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#171717]">
                    {item.exclusions.map((exclusion) => (
                      <li key={exclusion}>{exclusion}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
