"use client"

import { useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type DevisForm = {
  raisonSociale: string
  siret: string
  email: string
  telephone: string
  adresse: string
  codePostal: string
  ville: string
  activites: string
  chiffreAffaires: string
  primeAnnuelle: string
  adresseOperation: string
  coutConstruction: string
  typeConstruction: string
  destination: string
}

const EMPTY_FORM: DevisForm = {
  raisonSociale: "",
  siret: "",
  email: "",
  telephone: "",
  adresse: "",
  codePostal: "",
  ville: "",
  activites: "",
  chiffreAffaires: "",
  primeAnnuelle: "",
  adresseOperation: "",
  coutConstruction: "",
  typeConstruction: "",
  destination: "",
}

function textValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function activitiesValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join("\n")
  }
  return textValue(value)
}

function formFromData(data: Record<string, unknown>): DevisForm {
  return {
    raisonSociale: textValue(data.raisonSociale),
    siret: textValue(data.siret),
    email: textValue(data.email),
    telephone: textValue(data.telephone),
    adresse: textValue(data.adresse),
    codePostal: textValue(data.codePostal),
    ville: textValue(data.ville),
    activites: activitiesValue(data.activites),
    chiffreAffaires: textValue(data.chiffreAffaires),
    primeAnnuelle: textValue(data.primeAnnuelle),
    adresseOperation: textValue(data.adresseOperation || data.projectAddress || data.adresseConstruction),
    coutConstruction: textValue(data.coutConstruction),
    typeConstruction: textValue(data.typeConstruction),
    destination: textValue(data.destination),
  }
}

export function ModifierDevisButton({
  documentId,
  documentType,
  numero,
  onDone,
  onSaved,
}: {
  documentId: string
  documentType: string
  numero: string
  onDone?: (message: string, type: "success" | "error") => void
  onSaved?: (data: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<DevisForm>(EMPTY_FORM)
  const isDo = documentType === "devis_do"

  const openForm = async () => {
    setOpen(true)
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/gestion/documents/${documentId}`)
      const json = await readResponseJson<{ error?: string; data?: Record<string, unknown> }>(res)
      if (!res.ok || !json.data) throw new Error(json.error || "Devis introuvable")
      setForm(formFromData(json.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Devis introuvable")
    } finally {
      setLoading(false)
    }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.email.trim()) {
      setError("L'email du devis est requis.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data: Record<string, unknown> = {
        raisonSociale: form.raisonSociale,
        siret: form.siret,
        email: form.email,
        telephone: form.telephone,
        adresse: form.adresse,
        codePostal: form.codePostal,
        ville: form.ville,
        activites: form.activites,
        chiffreAffaires: form.chiffreAffaires,
        primeAnnuelle: form.primeAnnuelle,
      }
      if (isDo) {
        data.adresseOperation = form.adresseOperation
        data.coutConstruction = form.coutConstruction
        data.typeConstruction = form.typeConstruction
        data.destination = form.destination
      }
      const res = await fetch(`/api/gestion/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      })
      const json = await readResponseJson<{ error?: string; data?: Record<string, unknown> }>(res)
      if (!res.ok) throw new Error(json.error || "Enregistrement impossible")
      if (json.data) onSaved?.(json.data)
      onDone?.(`Devis ${numero} mis à jour.`, "success")
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enregistrement impossible"
      setError(message)
      onDone?.(message, "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openForm()}
        className="rounded-lg border border-[#2563eb] px-3 py-1.5 text-xs font-semibold text-[#93c5fd] hover:border-[#60a5fa]"
      >
        Modifier le devis
      </button>
      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(event) => void save(event)}
            className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-gray-700 bg-[#252525]"
          >
            <div className="space-y-3 overflow-auto p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Modifier le devis {numero}</h3>
              <p className="mt-1 text-xs text-gray-300">
                La modification met à jour le devis déjà présent sur cette fiche.
              </p>
            </div>
            {loading ? <p className="text-sm text-gray-300">Chargement du devis…</p> : null}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.raisonSociale}
                onChange={(event) => setForm((current) => ({ ...current, raisonSociale: event.target.value }))}
                placeholder="Raison sociale"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.siret}
                onChange={(event) => setForm((current) => ({ ...current, siret: event.target.value }))}
                placeholder="SIRET"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.telephone}
                onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))}
                placeholder="Téléphone"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.adresse}
                onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))}
                placeholder="Adresse"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white sm:col-span-2"
              />
              <input
                value={form.codePostal}
                onChange={(event) => setForm((current) => ({ ...current, codePostal: event.target.value }))}
                placeholder="Code postal"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.ville}
                onChange={(event) => setForm((current) => ({ ...current, ville: event.target.value }))}
                placeholder="Ville"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.chiffreAffaires}
                onChange={(event) => setForm((current) => ({ ...current, chiffreAffaires: event.target.value }))}
                placeholder="Chiffre d'affaires"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              <input
                value={form.primeAnnuelle}
                onChange={(event) => setForm((current) => ({ ...current, primeAnnuelle: event.target.value }))}
                placeholder="Prime annuelle"
                className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              />
              {isDo ? (
                <>
                  <input
                    value={form.adresseOperation}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, adresseOperation: event.target.value }))
                    }
                    placeholder="Adresse de construction"
                    className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white sm:col-span-2"
                  />
                  <input
                    value={form.coutConstruction}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, coutConstruction: event.target.value }))
                    }
                    placeholder="Montant des garanties"
                    className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={form.typeConstruction}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, typeConstruction: event.target.value }))
                    }
                    placeholder="Type de construction"
                    className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={form.destination}
                    onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))}
                    placeholder="Destination"
                    className="rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white sm:col-span-2"
                  />
                </>
              ) : null}
            </div>
            <textarea
              rows={4}
              value={form.activites}
              onChange={(event) => setForm((current) => ({ ...current, activites: event.target.value }))}
              placeholder="Activités, une par ligne"
              className="w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white"
            />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={loading || saving}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer le devis"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
