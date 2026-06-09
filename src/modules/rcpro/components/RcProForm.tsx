"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { RcProOptions, RC_PRO_AVAILABLE_OPTIONS } from "@/src/modules/rcpro/components/RcProOptions"
import { RcProSummary } from "@/src/modules/rcpro/components/RcProSummary"
import { computeRcProPrice } from "@/src/modules/rcpro/lib/rcproEngine"
import { validateRcProFormInput } from "@/src/modules/rcpro/lib/rcproValidation"
import type { RcProInput } from "@/src/modules/rcpro/types/rcpro.types"

type RcProStep = 1 | 2 | 3

const defaultForm: RcProInput = {
  activity: "",
  revenue: 0,
  employees: 0,
  riskLevel: 1,
  options: [],
}

const RC_PRO_RESUME_STORAGE_KEY = "optimum-rcpro-resume"

type RcProResumeDraft = {
  form: RcProInput
  step: RcProStep
  autoSubmit?: boolean
}

function parseRcProResumeDraft(raw: unknown): RcProResumeDraft | null {
  if (!raw || typeof raw !== "object") return null
  const draft = raw as Record<string, unknown>
  const parsedForm = validateRcProFormInput(draft.form)
  if (!parsedForm.ok) return null
  const step = draft.step === 1 || draft.step === 2 || draft.step === 3 ? draft.step : 3
  return {
    form: parsedForm.value,
    step,
    autoSubmit: draft.autoSubmit === true,
  }
}

export function RcProForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status: sessionStatus } = useSession()
  const [step, setStep] = useState<RcProStep>(1)
  const [form, setForm] = useState<RcProInput>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [resumeDraft, setResumeDraft] = useState<RcProResumeDraft | null>(null)
  const resumeLoadedRef = useRef(false)
  const resumeSubmittedRef = useRef(false)
  const resumeParam = searchParams?.get("resume") ?? null

  const breakdown = useMemo(() => {
    try {
      return computeRcProPrice(form)
    } catch {
      return null
    }
  }, [form])

  const redirectToLogin = useCallback(
    (input: RcProInput) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          RC_PRO_RESUME_STORAGE_KEY,
          JSON.stringify({
            form: input,
            step: 3,
            autoSubmit: true,
          } satisfies RcProResumeDraft)
        )
      }
      setResumeMessage("Connexion requise pour enregistrer le devis RC Pro. Votre saisie a ete conservee.")
      router.push(`/connexion?callbackUrl=${encodeURIComponent("/devis/rcpro?resume=1")}`)
    },
    [router]
  )

  const submitQuote = useCallback(
    async (input: RcProInput) => {
      setError(null)
      if (sessionStatus !== "authenticated") {
        redirectToLogin(input)
        return
      }

      setLoading(true)
      try {
        const calcRes = await fetch("/api/rcpro/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
        if (!calcRes.ok) {
          const data = (await calcRes.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error || "Impossible de calculer le tarif RC Pro.")
        }

        await calcRes.json()
        const createRes = await fetch("/api/rcpro/create-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
        if (createRes.status === 401) {
          redirectToLogin(input)
          return
        }
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
    },
    [redirectToLogin, router, sessionStatus]
  )

  useEffect(() => {
    if (resumeParam !== "1" || resumeLoadedRef.current || typeof window === "undefined") return
    resumeLoadedRef.current = true
    try {
      const saved = window.sessionStorage.getItem(RC_PRO_RESUME_STORAGE_KEY)
      window.sessionStorage.removeItem(RC_PRO_RESUME_STORAGE_KEY)
      const parsed = saved ? parseRcProResumeDraft(JSON.parse(saved)) : null
      if (parsed) {
        setForm(parsed.form)
        setStep(parsed.step)
        setResumeDraft(parsed)
        if (parsed.autoSubmit) {
          setResumeMessage("Connexion reussie. Reprise de votre devis RC Pro...")
        }
      }
    } catch {
      window.sessionStorage.removeItem(RC_PRO_RESUME_STORAGE_KEY)
    }
    router.replace("/devis/rcpro", { scroll: false })
  }, [resumeParam, router])

  useEffect(() => {
    if (!resumeDraft?.autoSubmit || sessionStatus !== "authenticated" || resumeSubmittedRef.current) return
    resumeSubmittedRef.current = true
    void submitQuote(resumeDraft.form)
  }, [resumeDraft, sessionStatus, submitQuote])

  async function handleCalculateAndSave() {
    setError(null)
    const validation = validateRcProFormInput(form)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    await submitQuote(validation.value)
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

        {step === 3 && sessionStatus === "unauthenticated" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Connectez-vous pour enregistrer ce devis RC Pro et le retrouver dans votre espace client. Votre saisie
            sera conservee.
          </div>
        )}
        {resumeMessage && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {resumeMessage}
          </div>
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
              disabled={loading || sessionStatus === "loading"}
              className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {sessionStatus === "loading"
                ? "Verification de la session..."
                : loading
                  ? "Traitement..."
                  : sessionStatus === "authenticated"
                    ? "Calculer et enregistrer le devis"
                    : "Se connecter pour enregistrer le devis"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
