import { sendEmail } from "@/lib/email"
import { logAiReport } from "@/optimum-geo-intelligence/services/audit-log"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"
import type { OgiAlertSeverity } from "@/optimum-geo-intelligence/types"

export async function createAlert(input: {
  category: string
  title: string
  message: string
  severity: OgiAlertSeverity
  payload?: Record<string, unknown>
}) {
  const sb = getSupabaseAdminClient()
  const { data, error } = await sb
    .from("alerts")
    .insert({
      category: input.category,
      title: input.title,
      message: input.message,
      severity: input.severity,
      payload: input.payload ?? {},
      status: "open",
    })
    .select("id")
    .single()
  if (error) throw error

  await sb.from("notifications").insert({
    alert_id: data.id,
    channel: "dashboard",
    status: "queued",
    payload: { title: input.title, message: input.message },
  })
  return data.id
}

async function createAlertIfMissing(input: {
  category: string
  title: string
  message: string
  severity: OgiAlertSeverity
  payload?: Record<string, unknown>
}) {
  const sb = getSupabaseAdminClient()
  const recentIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await sb
    .from("alerts")
    .select("id")
    .eq("category", input.category)
    .eq("title", input.title)
    .eq("message", input.message)
    .in("status", ["open", "acknowledged"])
    .gte("created_at", recentIso)
    .maybeSingle()
  if (existing?.id) return null
  const id = await createAlert(input)
  return id
}

async function pushEmailNotification(alertId: string, subject: string, body: string) {
  const to = process.env.ALERTS_EMAIL_TO?.trim()
  if (!to) return false
  const success = await sendEmail({
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
  })
  const sb = getSupabaseAdminClient()
  await sb.from("notifications").insert({
    alert_id: alertId,
    channel: "email",
    status: success ? "sent" : "failed",
    payload: { to, subject },
  })
  return success
}

export async function runAlertCenter() {
  const sb = getSupabaseAdminClient()
  let created = 0

  const { data: newCompetitorPages } = await sb
    .from("competitor_pages")
    .select("id,url,competitor_id,crawled_at")
    .eq("is_new", true)
    .gte("crawled_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  for (const row of newCompetitorPages ?? []) {
    const alertId = await createAlertIfMissing({
      category: "concurrence",
      severity: "high",
      title: "Nouvelle page concurrente détectée",
      message: `Une nouvelle page concurrente a été détectée: ${row.url}`,
      payload: row,
    })
    if (!alertId) continue
    await pushEmailNotification(alertId, "Alerte concurrence OGI", `Nouvelle page détectée: ${row.url}`)
    created++
  }

  const { data: latestGlobalScores } = await sb
    .from("geo_scores")
    .select("score,measured_at")
    .eq("scope_type", "global")
    .order("measured_at", { ascending: false })
    .limit(2)
  if ((latestGlobalScores?.length ?? 0) >= 2) {
    const [last, previous] = latestGlobalScores as Array<{ score: number; measured_at: string }>
    if (Number(last.score) < Number(previous.score) - 8) {
      const alertId = await createAlertIfMissing({
        category: "geo",
        severity: "critical",
        title: "Perte de visibilité GEO",
        message: `Le GEO_SCORE global a baissé de ${Math.round(Number(previous.score) - Number(last.score))} points.`,
        payload: { last, previous },
      })
      if (alertId) {
        await pushEmailNotification(
          alertId,
          "Alerte GEO_SCORE en baisse",
          `Le score global est passé de ${previous.score} à ${last.score}.`
        )
        created++
      }
    }
  }

  const { data: lowSeoPages } = await sb
    .from("seo_scores")
    .select("path,score")
    .lt("score", 45)
    .order("measured_at", { ascending: false })
    .limit(5)

  for (const page of lowSeoPages ?? []) {
    const alertId = await createAlertIfMissing({
      category: "seo",
      severity: "medium",
      title: "Page SEO faible",
      message: `La page ${page.path} a un score SEO bas (${page.score}).`,
      payload: page as Record<string, unknown>,
    })
    if (!alertId) continue
    await pushEmailNotification(alertId, "Alerte SEO OGI", `Page ${page.path} score ${page.score}.`)
    created++
  }

  await logAiReport({
    reportType: "alert_center",
    status: "success",
    title: "Centre d'alertes exécuté",
    summary: `${created} alertes créées`,
    payload: { created },
  })

  return { created }
}
