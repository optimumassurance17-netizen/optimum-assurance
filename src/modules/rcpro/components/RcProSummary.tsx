"use client"

import type { RcProOptionInput, RcProPricingBreakdown } from "@/src/modules/rcpro/types/rcpro.types"

type RcProSummaryProps = {
  activity: string
  revenue: number
  employees: number
  riskLevel: number
  options: RcProOptionInput[]
  breakdown: RcProPricingBreakdown | null
}

export function RcProSummary({
  activity,
  revenue,
  employees,
  riskLevel,
  options,
  breakdown,
}: RcProSummaryProps) {
  return (
    <section className="rounded-2xl border border-[#d4d4d4] bg-white p-5">
      <h3 className="mb-3 text-lg font-semibold text-[#0a0a0a]">Récapitulatif RC Pro</h3>
      <dl className="grid grid-cols-1 gap-2 text-sm text-[#171717]">
        <div>
          <dt className="font-medium">Activité</dt>
          <dd>{activity || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">Chiffre d’affaires</dt>
          <dd>{revenue.toLocaleString("fr-FR")} €</dd>
        </div>
        <div>
          <dt className="font-medium">Employés</dt>
          <dd>{employees}</dd>
        </div>
        <div>
          <dt className="font-medium">Niveau de risque</dt>
          <dd>{riskLevel}/5</dd>
        </div>
        <div>
          <dt className="font-medium">Options</dt>
          <dd>{options.length > 0 ? options.map((o) => o.label).join(", ") : "Aucune"}</dd>
        </div>
      </dl>

      {breakdown && (
        <div className="mt-4 rounded-xl bg-[#f8fafc] p-4 text-sm text-[#0f172a]">
          <p>Base: {breakdown.base.toLocaleString("fr-FR")} €</p>
          <p>Coeff. CA: x{breakdown.revenueMultiplier.toFixed(2)}</p>
          <p>Maj. employés: +{breakdown.employeeAddon.toLocaleString("fr-FR")} €</p>
          <p>Coeff. risque: x{breakdown.riskMultiplier.toFixed(2)}</p>
          <p>Options fixes: +{breakdown.fixedOptionsTotal.toLocaleString("fr-FR")} €</p>
          <p>Coeff. options %: x{breakdown.percentOptionsMultiplier.toFixed(3)}</p>
        </div>
      )}
    </section>
  )
}
