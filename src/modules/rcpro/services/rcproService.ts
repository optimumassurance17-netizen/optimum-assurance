import { requireCoreSupabaseServiceClient } from "@/lib/core/supabase"
import type {
  RcProQuoteCreatePayload,
  RcProQuoteRecord,
  RcProQuoteStatus,
  RcProUserQuoteSummary,
} from "@/src/modules/rcpro/types/rcpro.types"

function parseStatus(value: unknown): RcProQuoteStatus {
  if (value === "active") return "active"
  if (value === "cancelled") return "cancelled"
  return "draft"
}

function parseDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value
  return new Date(0).toISOString()
}

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapDbQuote(row: Record<string, unknown>): RcProQuoteRecord {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    activity: String(row.activity ?? ""),
    revenue: toNumber(row.revenue),
    employees: Math.max(0, Math.trunc(toNumber(row.employees))),
    price: toNumber(row.price),
    status: parseStatus(row.status),
    created_at: parseDate(row.created_at),
  }
}

export async function createRcProQuote(
  payload: RcProQuoteCreatePayload & { user_id: string }
): Promise<RcProQuoteRecord> {
  const supabase = requireCoreSupabaseServiceClient()
  const { data, error } = await supabase
    .from("rcpro_quotes")
    .insert({
      user_id: payload.user_id,
      activity: payload.activity,
      revenue: payload.revenue,
      employees: payload.employees,
      price: payload.price,
      status: payload.status,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`RC Pro create quote failed: ${error.message}`)
  }
  return mapDbQuote(data as Record<string, unknown>)
}

export async function getUserRcProQuotes(userId: string): Promise<RcProUserQuoteSummary[]> {
  const supabase = requireCoreSupabaseServiceClient()
  const { data, error } = await supabase
    .from("rcpro_quotes")
    .select("id,activity,price,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`RC Pro get user quotes failed: ${error.message}`)
  }

  return (data || []).map((row) => ({
    id: String((row as Record<string, unknown>).id ?? ""),
    activity: String((row as Record<string, unknown>).activity ?? ""),
    price: toNumber((row as Record<string, unknown>).price),
    status: parseStatus((row as Record<string, unknown>).status),
    created_at: parseDate((row as Record<string, unknown>).created_at),
  }))
}

export async function getUserRcProQuoteById(
  userId: string,
  quoteId: string
): Promise<RcProQuoteRecord | null> {
  const supabase = requireCoreSupabaseServiceClient()
  const { data, error } = await supabase
    .from("rcpro_quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`RC Pro get quote by id failed: ${error.message}`)
  }
  if (!data) return null
  return mapDbQuote(data as Record<string, unknown>)
}
