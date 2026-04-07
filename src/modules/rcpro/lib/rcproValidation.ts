import type { RcProInput, RcProOptionInput } from "@/src/modules/rcpro/types/rcpro.types"

const MAX_ACTIVITY_LEN = 200
const MAX_OPTIONS = 20

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toOption(v: unknown): RcProOptionInput | null {
  if (!v || typeof v !== "object") return null
  const row = v as Record<string, unknown>
  const code = typeof row.code === "string" ? row.code.trim() : ""
  const label = typeof row.label === "string" ? row.label.trim() : ""
  const type = row.type === "fixed" || row.type === "percent" ? row.type : null
  const value = toNumber(row.value)
  if (!code || !label || !type || value == null || value < 0) return null
  return { code, label, type, value }
}

export function validateRcProFormInput(
  input: unknown
):
  | { ok: true; value: RcProInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Corps JSON invalide." }
  }

  const raw = input as Record<string, unknown>
  const activity = typeof raw.activity === "string" ? raw.activity.trim() : ""
  if (!activity || activity.length > MAX_ACTIVITY_LEN) {
    return { ok: false, error: "Activité invalide." }
  }

  const revenue = toNumber(raw.revenue)
  if (revenue == null || revenue < 0) {
    return { ok: false, error: "Chiffre d’affaires invalide." }
  }

  const employeesNum = toNumber(raw.employees)
  if (employeesNum == null || !Number.isInteger(employeesNum) || employeesNum < 0) {
    return { ok: false, error: "Nombre d’employés invalide." }
  }

  const riskNum = toNumber(raw.riskLevel)
  if (riskNum == null || !Number.isInteger(riskNum) || riskNum < 1 || riskNum > 5) {
    return { ok: false, error: "Niveau de risque invalide (1 à 5)." }
  }

  const optionsRaw = Array.isArray(raw.options) ? raw.options : []
  if (optionsRaw.length > MAX_OPTIONS) {
    return { ok: false, error: "Trop d’options sélectionnées." }
  }
  const options: RcProOptionInput[] = []
  for (const item of optionsRaw) {
    const option = toOption(item)
    if (!option) return { ok: false, error: "Options invalides." }
    options.push(option)
  }

  return {
    ok: true,
    value: {
      activity,
      revenue,
      employees: employeesNum,
      riskLevel: riskNum as RcProInput["riskLevel"],
      options,
    },
  }
}

export const validateRcProCalculateInput = validateRcProFormInput

