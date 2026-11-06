"use client"

import { useEffect, useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type Choix = { activite: string; categorie: string }

type Etat = {
  available: boolean
  message?: string
  activites: string[]
  choix: Choix[]
  primeAnnuelle: number
  numero: string
}

type Resultat = {
  activite: string
  nouvellePrimeAnnuelle: number
  regularisation: number
  cotisationInchangee: boolean
}

export function AjoutActiviteClient() {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [activite, setActivite] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultat, setResultat] = useState<Resultat | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/client/ajout-activite")
        const json = await readResponseJson<Etat & { error?: string }>(res)
        if (!res.ok) throw new Error(json.error || "Impossible de charger les activités.")
        if (!cancelled) setEtat(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossible de charger les activités.")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error && !etat) return null
  if (!etat?.available) return null

  const categories = [...new Set(etat.choix.map((item) => item.categorie))]

  return (
    <section className="mb-10 rounded-2xl border border-[#d4d4d4] bg-white p-5">
      <h3 className="mb-2 text-base font-semibold text-[#0a0a0a]">Ajouter une activité</h3>
      <p className="mb-4 text-sm leading-relaxed text-[#171717]">
        Vous pouvez ajouter une activité à votre assurance décennale{etat.numero ? ` ${etat.numero}` : ""}, dans la
        limite de 8. Si l&apos;activité augmente la cotisation, la différence sur les échéances déjà payées est
        régularisée et reportée. Les prochaines échéances suivent la nouvelle cotisation.
      </p>
      <p className="mb-3 text-sm text-[#171717]">
        Cotisation annuelle actuelle : {etat.primeAnnuelle.toLocaleString("fr-FR")} €
      </p>
      {etat.choix.length === 0 ? (
        <p className="text-sm text-[#171717]">Le contrat a déjà atteint 8 activités.</p>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={async (event) => {
            event.preventDefault()
            setLoading(true)
            setError(null)
            try {
              const res = await fetch("/api/client/ajout-activite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activite }),
              })
              const json = await readResponseJson<Resultat & { error?: string; ok?: boolean }>(res)
              if (!res.ok || !json.activite) {
                throw new Error(json.error || "Impossible d'ajouter cette activité.")
              }
              setResultat(json)
              setActivite("")
              const reload = await fetch("/api/client/ajout-activite")
              if (reload.ok) setEtat(await readResponseJson<Etat>(reload))
            } catch (err) {
              setError(err instanceof Error ? err.message : "Impossible d'ajouter cette activité.")
            } finally {
              setLoading(false)
            }
          }}
        >
          <select
            value={activite}
            onChange={(event) => setActivite(event.target.value)}
            required
            className="flex-1 rounded-xl border border-[#d4d4d4] bg-[#e4e4e4] px-4 py-2.5 text-[#0a0a0a]"
            aria-label="Activité à ajouter"
          >
            <option value="">Choisir une activité</option>
            {categories.map((categorie) => (
              <optgroup key={categorie} label={categorie}>
                {etat.choix
                  .filter((item) => item.categorie === categorie)
                  .map((item) => (
                    <option key={item.activite} value={item.activite}>
                      {item.activite}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !activite}
            className="rounded-xl bg-[#2563eb] px-4 py-2.5 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {loading ? "Ajout..." : "Ajouter et régulariser"}
          </button>
        </form>
      )}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {resultat ? (
        <div className="mt-3 rounded-xl border border-[#dbe3ee] bg-[#f8fafc] p-3 text-sm text-[#0a0a0a]">
          <p>Activité ajoutée : {resultat.activite}</p>
          <p>Nouvelle cotisation annuelle : {resultat.nouvellePrimeAnnuelle.toLocaleString("fr-FR")} €</p>
          {resultat.regularisation > 0 ? (
            <p className="font-semibold text-amber-700">
              Régularisation due : +{resultat.regularisation.toLocaleString("fr-FR")} €, reportée sur la prochaine
              échéance.
            </p>
          ) : (
            <p className="font-semibold text-emerald-700">
              {resultat.cotisationInchangee
                ? "Cotisation inchangée : aucune régularisation."
                : "Aucune régularisation immédiate. Les prochaines échéances suivent la nouvelle cotisation."}
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
