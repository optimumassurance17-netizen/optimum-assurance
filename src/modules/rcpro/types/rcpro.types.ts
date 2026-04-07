export type RcProQuoteStatus = "draft" | "active" | "cancelled"

export type RcProOptionType = "fixed" | "percent"

export type RcProOptionInput = {
  code: string
  label: string
  type: RcProOptionType
  /** fixed => € ; percent => pourcentage (ex: 8 = +8%) */
  value: number
}

export type RcProInput = {
  activity: string
  revenue: number
  employees: number
  riskLevel: 1 | 2 | 3 | 4 | 5
  options: RcProOptionInput[]
}

export type RcProPricingBreakdown = {
  base: number
  revenueMultiplier: number
  employeeAddon: number
  riskMultiplier: number
  fixedOptionsTotal: number
  percentOptionsMultiplier: number
}

export type RcProCalculateOutput = {
  price: number
  breakdown: RcProPricingBreakdown
}

/** Schéma DB demandé : rcpro_quotes */
export type RcProQuoteRecord = {
  id: string
  user_id: string
  activity: string
  revenue: number
  employees: number
  price: number
  status: RcProQuoteStatus
  created_at: string
}

export type RcProQuoteCreatePayload = RcProInput & {
  price: number
  legalNotes: string
  legalLinks: string
  status?: RcProQuoteStatus
}

export type RcProQuoteInsert = {
  user_id: string
  activity: string
  revenue: number
  employees: number
  price: number
  status: RcProQuoteStatus
}

export type RcProUserQuoteSummary = {
  id: string
  activity: string
  price: number
  status: RcProQuoteStatus
  created_at: string
}

export type RcProCalculateResponse = { price: number }
export type RcProCreateQuoteResponse = { quote: RcProQuoteRecord }
export type RcProListQuotesResponse = { quotes: RcProUserQuoteSummary[] }
export type RcProGetQuoteResponse = { quote: RcProQuoteRecord }
export type RcProErrorResponse = { error: string }
