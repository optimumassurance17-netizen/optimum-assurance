"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { RcProOptions, RC_PRO_AVAILABLE_OPTIONS } from "@/src/modules/rcpro/components/RcProOptions"
import { RcProSummary } from "@/src/modules/rcpro/components/RcProSummary"
import { computeRcProPrice } from "@/src/modules/rcpro/lib/rcproEngine"
import { validateRcProFormInput } from "@/src/modules/rcpro/lib/rcproValidation"
import type { RcProInput } from "@/src/modules/rcpro/types/rcpro.types"

const defaultForm: RcProInput = {
  activity: "",
  revenue: 0,
  employees: 0,
  riskLevel: 1,
  options: [],
}

export function RcProForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<RcProInput>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const breakdown = useMemo(() => {
    try {
      return computeRcProPrice(form)
    } catch {
      return null
    }
  }, [form])

  async function handleCalculateAndSave() {
    setError(null)
    const validation = validateRcProFormInput(form)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setLoading(true)
    try {
      const calcRes = await fetch("/api/rcpro/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!calcRes.ok) {
        const data = (await calcRes.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || "Impossible de calculer le tarif RC Pro.")
      }

      await calcRes.json()
      const createRes = await fetch("/api/rcpro/create-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!createRes.ok) {
        const data = (await createRes.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || "Impossible de créer le devis RC Pro.")
      }
      const createData = (await createRes.json()) as { quote: { id: string; price: number } }
      router.push(
        `/devis/rcpro/result?id=${encodeURIComponent(createData.quote.id)}&price=${encodeURIComponent(
          String(createData.quote.price)
        )}`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d4d4d4] bg-white p-5">
        <p className="text-sm text-[#475569]">Étape {step}/3</p>

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Activité</label>
              <input
                value={form.activity}
                onChange={(e) => setForm((p) => ({ ...p, activity: e.target.value }))}
                className="w-full rounded-xl border border-[#d4d4d4] bg-[#f8fafc] px-3 py-2"
                placeholder="Ex: Conseil en informatique"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Chiffre d’affaires (€)</label>
                <input
                  type="number"
                  min={0}
                  value={form.revenue}
                  onChange={(e) => setForm((p) => ({ ...p, revenue: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-[#d4d4d4] bg-[#f8fafc] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Nombre d’employés</label>
                <input
                  type="number"
                  min={0}
                  value={form.employees}
                  onChange={(e) => setForm((p) => ({ ...p, employees: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-[#d4d4d4] bg-[#f8fafc] px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0a0a0a]">Niveau de risque (1 à 5)</label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={form.riskLevel}
                onChange={(e) =>
                  setForm((p) => ({ ...p, riskLevel: Number(e.target.value) as RcProInput["riskLevel"] }))
                }
                className="w-full"
              />
              <p className="text-sm text-[#171717]">Risque sélectionné : {form.riskLevel}/5</p>
            </div>
            <RcProOptions
              options={RC_PRO_AVAILABLE_OPTIONS}
              selected={form.options}
              onChange={(next) => setForm((p) => ({ ...p, options: next }))}
            />
          </div>
        )}

        {step === 3 && (
          <RcProSummary
            activity={form.activity}
            revenue={form.revenue}
            employees={form.employees}
            riskLevel={form.riskLevel}
            options={form.options}
            breakdown={breakdown}
          />
        )}

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="rounded-xl border border-[#d4d4d4] px-4 py-2 text-sm"
            >
              Retour
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white"
            >
              Continuer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCalculateAndSave}
              disabled={loading}
              className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Traitement..." : "Calculer et enregistrer le devis"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
