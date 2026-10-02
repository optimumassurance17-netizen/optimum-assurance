import { garantiesDecennale } from "@/lib/garanties-data"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"

export type DecennaleGarantieRow = {
  nom: string
  description: string
  plafond: string
  franchise: string
}

function asNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\s/g, "").replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

/** Même lecture que le devis et le contrat : franchise du dossier, sinon 1 000 € ; plafond 2× le CA. */
export function resolveDecennaleFranchisePlafond(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
}): { franchise: number; plafond: number | null; franchiseLabel: string; plafondLabel: string } {
  const franchiseRaw = asNonNegativeNumber(data.franchise)
  const franchise = franchiseRaw != null && franchiseRaw > 0 ? franchiseRaw : FRANCHISE_DECENNALE_EUR
  const plafondDirect = asNonNegativeNumber(data.plafond)
  const chiffreAffaires = asNonNegativeNumber(data.chiffreAffaires)
  const plafond =
    plafondDirect != null && plafondDirect > 0
      ? plafondDirect
      : chiffreAffaires != null && chiffreAffaires > 0
        ? chiffreAffaires * 2
        : null
  return {
    franchise,
    plafond,
    franchiseLabel: `${franchise.toLocaleString("fr-FR")} €`,
    plafondLabel: plafond != null ? `${plafond.toLocaleString("fr-FR")} €` : garantiesDecennale[0].plafond,
  }
}

export function decennaleGarantieRows(data: {
  franchise?: unknown
  plafond?: unknown
  chiffreAffaires?: unknown
}): DecennaleGarantieRow[] {
  const { franchiseLabel, plafondLabel } = resolveDecennaleFranchisePlafond(data)
  return [
    {
      nom: garantiesDecennale[0].nom,
      description: garantiesDecennale[0].description,
      plafond: plafondLabel,
      franchise: franchiseLabel,
    },
    {
      nom: garantiesDecennale[1].nom,
      description: garantiesDecennale[1].description,
      plafond: garantiesDecennale[1].plafond,
      franchise: garantiesDecennale[1].franchise,
    },
    {
      nom: garantiesDecennale[2].nom,
      description: garantiesDecennale[2].description,
      plafond: garantiesDecennale[2].plafond,
      franchise: garantiesDecennale[2].franchise,
    },
    {
      nom: garantiesDecennale[3].nom,
      description: garantiesDecennale[3].description,
      plafond: garantiesDecennale[3].plafond,
      franchise: garantiesDecennale[3].franchise,
    },
  ]
}
