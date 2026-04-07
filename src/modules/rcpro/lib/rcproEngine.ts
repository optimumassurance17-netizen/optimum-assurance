import type { RcProInput, RcProPricingBreakdown } from "@/src/modules/rcpro/types/rcpro.types"

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function getRevenueMultiplier(revenue: number): number {
  if (revenue > 100_000) return 1.5
  if (revenue > 50_000) return 1.2
  return 1
}

function optionsFixedTotal(options: RcProInput["options"]): number {
  return options
    .filter((o) => o.type === "fixed")
    .reduce((sum, o) => sum + o.value, 0)
}

function optionsPercentMultiplier(options: RcProInput["options"]): number {
  return options
    .filter((o) => o.type === "percent")
    .reduce((mul, o) => mul * (1 + o.value / 100), 1)
}

export function computeRcProPrice(input: RcProInput): RcProPricingBreakdown & { price: number } {
  const safeInput = input
  const base = 120
  const revenueMultiplier = getRevenueMultiplier(safeInput.revenue)
  const employeeAddon = safeInput.employees * 25
  const riskMultiplier = safeInput.riskLevel
  const fixedOptionsTotal = optionsFixedTotal(safeInput.options)
  const percentOptionsMultiplier = optionsPercentMultiplier(safeInput.options)

  const stepAfterRevenue = base * revenueMultiplier
  const stepAfterEmployees = stepAfterRevenue + employeeAddon
  const stepAfterRisk = stepAfterEmployees * riskMultiplier
  const stepAfterFixed = stepAfterRisk + fixedOptionsTotal
  const finalPrice = round2(stepAfterFixed * percentOptionsMultiplier)

  const breakdown: RcProPricingBreakdown & { price: number } = {
    base,
    revenueMultiplier,
    employeeAddon,
    riskMultiplier,
    fixedOptionsTotal,
    percentOptionsMultiplier,
    price: finalPrice,
  }

  return breakdown
}
