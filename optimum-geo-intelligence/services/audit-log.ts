import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

type AuditStatus = "success" | "warning" | "error"

export async function logAiReport(input: {
  reportType: string
  status: AuditStatus
  title: string
  summary: string
  payload?: Record<string, unknown>
}) {
  try {
    const sb = getSupabaseAdminClient()
    await sb.from("ai_reports").insert({
      report_type: input.reportType,
      status: input.status,
      title: input.title,
      summary: input.summary,
      payload: input.payload ?? {},
    })
  } catch (error) {
    console.error("[OGI] logAiReport:", error)
  }
}

export async function logCrawlRun(input: {
  source: string
  target: string
  status: AuditStatus
  message: string
  payload?: Record<string, unknown>
}) {
  try {
    const sb = getSupabaseAdminClient()
    await sb.from("crawl_logs").insert({
      source: input.source,
      target: input.target,
      status: input.status,
      message: input.message,
      payload: input.payload ?? {},
    })
  } catch (error) {
    console.error("[OGI] logCrawlRun:", error)
  }
}
