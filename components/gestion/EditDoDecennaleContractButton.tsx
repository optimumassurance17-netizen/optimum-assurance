"use client"

import { useState } from "react"
import { fetchClientSireneLookup, normalizeSiretForLookup } from "@/lib/client-sirene"
import { activitiesLabelFromJson, isEditablePlatformContractProduct } from "@/lib/platform-contract-edit"
import { readResponseJson } from "@/lib/read-response-json"

export type EditablePlatformContract = {
  id: string
  contractNumber: string
  productType: string
  clientName: string
  siret?: string | null
  address?: string | null
  activitiesJson?: string | null
  projectName?: string | null
  projectAddress?: string | null
  constructionNature?: string | null
  premium: number
}

type Props = {
  contract: EditablePlatformContract
  className?: string
  onSaved: () => void | Promise<void>
  onError: (message: string) => void
}

export function EditDoDecennaleContractButton({ contract, className, onSaved, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sireneError, setSireneError] = useState<string | null>(null)
  const [clientName, setClientName] = useState(contract.clientName)
  const [siret, setSiret] = useState(contract.siret ?? "")
  const [address, setAddress] = useState(contract.address ?? "")
  const [activities, setActivities] = useState(activitiesLabelFromJson(contract.activitiesJson))
  const [premium, setPremium] = useState(String(contract.premium))
  const [projectName, setProjectName] = useState(contract.projectName ?? "")
  const [projectAddress, setProjectAddress] = useState(contract.projectAddress ?? "")
  const [constructionNature, setConstructionNature] = useState(contract.constructionNature ?? "")

  if (!isEditablePlatformContractProduct(contract.productType)) return null

  const isDo = contract.productType === "do"

  function openEditor() {
    setClientName(contract.clientName)
    setSiret(contract.siret ?? "")
    setAddress(contract.address ?? "")
    setActivities(activitiesLabelFromJson(contract.activitiesJson))
    setPremium(String(contract.premium))
    setProjectName(contract.projectName ?? "")
    setProjectAddress(contract.projectAddress ?? "")
    setConstructionNature(contract.constructionNature ?? "")
    setSireneError(null)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={`disabled:opacity-50 ${className ?? "text-sky-400 hover:text-sky-300 text-xs font-medium"}`}
      >
        Modifier
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-3 py-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-600 bg-[#252525] p-6 shadow-xl"
            role="dialog"
            aria-labelledby={`edit-contract-${contract.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`edit-contract-${contract.id}`} className="text-lg font-semibold text-white">
              Modifier le contrat <span className="font-mono text-sky-300">{contract.contractNumber}</span>
            </h3>
            <p className="mt-1 text-xs text-gray-300">
              {isDo
                ? "Corrige l'assuré, l'adresse et le chantier du dommage ouvrage."
                : "Corrige l'assuré, l'adresse et les activités de la décennale."}
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <label className="block text-gray-200">
                Client
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                />
              </label>
              <label className="block text-gray-200">
                SIRET
                <input
                  value={siret}
                  onChange={(event) => setSiret(normalizeSiretForLookup(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 font-mono text-white"
                />
              </label>
              <button
                type="button"
                disabled={busy || normalizeSiretForLookup(siret).length !== 14}
                onClick={async () => {
                  setSireneError(null)
                  setBusy(true)
                  try {
                    const sirene = await fetchClientSireneLookup(siret)
                    if (sirene.raisonSociale) setClientName(sirene.raisonSociale)
                    const nextAddress = [sirene.adresse, [sirene.codePostal, sirene.ville].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ")
                    if (nextAddress) setAddress(nextAddress)
                  } catch (error) {
                    setSireneError(error instanceof Error ? error.message : "Entreprise introuvable")
                  } finally {
                    setBusy(false)
                  }
                }}
                className="rounded-lg border border-sky-500/70 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-900/40 disabled:opacity-50"
              >
                Remplir via Sirene
              </button>
              {sireneError ? <p className="text-xs text-red-400">{sireneError}</p> : null}
              <label className="block text-gray-200">
                Adresse
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                />
              </label>
              <label className="block text-gray-200">
                Activités
                <textarea
                  rows={3}
                  value={activities}
                  onChange={(event) => setActivities(event.target.value)}
                  placeholder="Liste complète, séparée par des virgules"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                />
              </label>
              <label className="block text-gray-200">
                Prime TTC (€)
                <input
                  inputMode="decimal"
                  value={premium}
                  onChange={(event) => setPremium(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                />
              </label>
              {isDo ? (
                <>
                  <label className="block text-gray-200">
                    Nom du chantier
                    <input
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-gray-200">
                    Adresse du chantier
                    <input
                      value={projectAddress}
                      onChange={(event) => setProjectAddress(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-gray-200">
                    Nature de la construction
                    <input
                      value={constructionNature}
                      onChange={(event) => setConstructionNature(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a1a] px-3 py-2 text-white"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-700 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-600 px-4 py-2 text-gray-200 hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const amount = Number(premium.replace(/\s/g, "").replace(",", "."))
                  if (!Number.isFinite(amount) || amount <= 0) {
                    onError("Prime invalide")
                    return
                  }
                  setBusy(true)
                  try {
                    const res = await fetch(`/api/gestion/insurance-contracts/${contract.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        clientName,
                        siret,
                        address,
                        activities,
                        premium: amount,
                        ...(isDo ? { projectName, projectAddress, constructionNature } : {}),
                      }),
                    })
                    const body = await readResponseJson<{ error?: string }>(res)
                    if (!res.ok) throw new Error(body.error || "Impossible de modifier le contrat")
                    setOpen(false)
                    await onSaved()
                  } catch (error) {
                    onError(error instanceof Error ? error.message : "Impossible de modifier le contrat")
                  } finally {
                    setBusy(false)
                  }
                }}
                className="rounded-lg bg-[#2563eb] px-5 py-2 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
