"use client"

import { useEffect, useMemo, useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"
import { clientSinistreContractOptions } from "@/lib/client-sinistre-declaration"

type ContractRef = { contractNumber: string; productType: string }
type DocumentRef = { numero: string; type: string }
type StoredSinistre = {
  id: string
  dateSinistre: string
  description: string | null
  createdAt: string
}

export function DeclarerSinistreCard(props: { contracts: ContractRef[]; documents: DocumentRef[] }) {
  const options = useMemo(
    () => clientSinistreContractOptions({ contracts: props.contracts, documents: props.documents }),
    [props.contracts, props.documents]
  )
  const [open, setOpen] = useState(false)
  const [dateSinistre, setDateSinistre] = useState("")
  const [contractNumber, setContractNumber] = useState("")
  const [montantEstime, setMontantEstime] = useState("")
  const [description, setDescription] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sinistres, setSinistres] = useState<StoredSinistre[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetch("/api/client/sinistres")
      if (!res.ok) return
      const json = await readResponseJson<{ sinistres?: StoredSinistre[] }>(res)
      if (!cancelled && Array.isArray(json.sinistres)) setSinistres(json.sinistres)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="declarer-sinistre" className="mb-8 rounded-2xl border border-[#fecaca] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#b91c1c]">Sinistre</p>
          <h2 className="mt-1 text-xl font-bold text-[#0a0a0a]">Déclarer un sinistre</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#171717]">
            Indiquez la date, le contrat s&apos;il est connu, et les faits. La déclaration est enregistrée ici et
            transmise à Optimum Assurance. Elle ne vaut pas acceptation de garantie.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current)
            setError(null)
          }}
          className="inline-flex items-center justify-center rounded-xl bg-[#b91c1c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#991b1b]"
        >
          Déclarer un sinistre
        </button>
      </div>

      {open ? (
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setSending(true)
            setError(null)
            setNotice(null)
            try {
              const res = await fetch("/api/client/sinistres", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dateSinistre,
                  description,
                  contractNumber,
                  montantEstime: montantEstime.trim() === "" ? null : montantEstime.trim(),
                }),
              })
              const json = await readResponseJson<{
                error?: string
                warning?: string
                sinistre?: StoredSinistre
              }>(res)
              if (!res.ok || !json.sinistre) {
                throw new Error(json.error || "La déclaration n'a pas pu être envoyée.")
              }
              setSinistres((current) => [json.sinistre!, ...current.filter((item) => item.id !== json.sinistre!.id)])
              setDateSinistre("")
              setContractNumber("")
              setMontantEstime("")
              setDescription("")
              setOpen(false)
              setNotice(
                json.warning ||
                  "Déclaration envoyée. Un accusé de réception vous a été adressé, et l'équipe en est informée."
              )
            } catch (err) {
              setError(err instanceof Error ? err.message : "La déclaration n'a pas pu être envoyée.")
            } finally {
              setSending(false)
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[#171717]">
              Date du sinistre
              <input
                type="date"
                required
                value={dateSinistre}
                onChange={(event) => setDateSinistre(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#0a0a0a]"
              />
            </label>
            <label className="block text-sm text-[#171717]">
              Contrat concerné
              <select
                value={contractNumber}
                onChange={(event) => setContractNumber(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#0a0a0a]"
              >
                <option value="">Non précisé</option>
                {options.map((option) => (
                  <option key={option.number} value={option.number}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm text-[#171717]">
            Montant estimé (€) — optionnel
            <input
              type="number"
              min={0}
              step="0.01"
              value={montantEstime}
              onChange={(event) => setMontantEstime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#0a0a0a]"
              placeholder="Ex. 1500"
            />
          </label>
          <label className="block text-sm text-[#171717]">
            Faits
            <textarea
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Que s'est-il passé, où, et quels dommages sont constatés ?"
              className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#0a0a0a]"
            />
          </label>
          {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-[#b91c1c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#991b1b] disabled:opacity-50"
            >
              {sending ? "Envoi…" : "Envoyer la déclaration"}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[#d4d4d4] px-4 py-2.5 text-sm font-medium text-[#171717]"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {notice ? <p className="mt-4 text-sm text-[#166534]">{notice}</p> : null}

      {sinistres.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {sinistres.map((item) => (
            <li key={item.id} className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3 text-sm text-[#171717]">
              <p className="font-medium text-[#0a0a0a]">
                {new Date(item.dateSinistre).toLocaleDateString("fr-FR")}
              </p>
              <p className="mt-1 whitespace-pre-line">{item.description || "Déclaration enregistrée"}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
